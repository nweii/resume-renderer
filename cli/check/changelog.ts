// Enforces the changelog contract: a change that touches source files must add
// an entry under `## Unreleased` in CHANGELOG.md, or say in the commit message
// that it deliberately has nothing to port. Silence is the failure.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const CHANGELOG = "CHANGELOG.md";

/** The trailer that says "I decided this needs no entry, and here is why". */
export const EXEMPTION_TRAILER = "no-changelog";

const EXEMPTION = /^no-changelog:[ \t]*(\S.*)$/im;

/**
 * Paths whose changes never reach a downstream copy, so they carry no port
 * decision. Everything else in the tree counts as source, including docs — a
 * downstream reads the same docs and a wording change can matter to it.
 */
const OUTSIDE_CONTRACT = [/^CHANGELOG\.md$/, /^\.claude\//];

type ChangeSet = {
  /** `working tree`, or a commit rendered as `<short sha> <subject>`. */
  scope: string;
  sourceFiles: string[];
  /** The reason given on an exemption trailer, when one is present. */
  exemption?: string;
  hasUnreleasedEntry: boolean;
};

export type ChangelogReport = {
  /** What was examined: `working tree` or the commit range. */
  scope: string;
  examined: number;
  exempt: { scope: string; reason: string }[];
  missing: { scope: string; sourceFiles: string[] }[];
};

function git(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr?.trim() || "unknown error"}`,
    );
  }
  return result.stdout;
}

/** Like `git`, but an absent path is an empty result rather than a failure. */
function gitOrEmpty(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout : "";
}

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line.length > 0);
}

function isSource(path: string): boolean {
  return !OUTSIDE_CONTRACT.some((pattern) => pattern.test(path));
}

/**
 * The 1-indexed line range that belongs to the `## Unreleased` section: every
 * line after that heading up to the next `## ` heading, or the end of the file.
 */
export function unreleasedRange(
  changelog: string,
): { start: number; end: number } | null {
  const fileLines = changelog.split("\n");
  const headingIndex = fileLines.findIndex((line) =>
    /^##\s+Unreleased\s*$/i.test(line),
  );
  if (headingIndex === -1) return null;

  const rest = fileLines.slice(headingIndex + 1);
  const nextHeading = rest.findIndex((line) => /^##\s/.test(line));
  const end =
    nextHeading === -1 ? fileLines.length : headingIndex + 1 + nextHeading;

  return { start: headingIndex + 2, end };
}

/**
 * Line numbers added on the new side of a unified diff. Callers generate the
 * diff with `--unified=0`, so each hunk header names exactly the added lines.
 */
export function addedLineNumbers(diff: string): number[] {
  const added: number[] = [];
  let cursor = 0;

  for (const line of diff.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      cursor = Number(hunk[1]);
      continue;
    }
    if (cursor === 0) continue;
    if (line.startsWith("+++")) continue;
    if (line.startsWith("+")) {
      added.push(cursor);
      cursor += 1;
    }
  }

  return added;
}

export function addsUnreleasedEntry(changelog: string, diff: string): boolean {
  const range = unreleasedRange(changelog);
  if (!range) return false;

  return addedLineNumbers(diff).some(
    (line) => line >= range.start && line <= range.end,
  );
}

function workingTreeChangeSet(): ChangeSet {
  const changed = [
    ...lines(git(["diff", "HEAD", "--name-only"])),
    ...lines(git(["ls-files", "--others", "--exclude-standard"])),
  ];

  return {
    scope: "working tree",
    sourceFiles: [...new Set(changed)].filter(isSource).sort(),
    hasUnreleasedEntry: addsUnreleasedEntry(
      existsSync(CHANGELOG) ? readFileSync(CHANGELOG, "utf8") : "",
      git(["diff", "HEAD", "--unified=0", "--", CHANGELOG]),
    ),
  };
}

function commitChangeSet(sha: string): ChangeSet {
  const subject = git(["log", "-1", "--format=%s", sha]).trim();
  const message = git(["log", "-1", "--format=%B", sha]);
  const changed = lines(
    git(["diff-tree", "--no-commit-id", "--name-only", "-r", sha]),
  );
  const exemption = EXEMPTION.exec(message)?.[1]?.trim();

  return {
    scope: `${sha.slice(0, 7)} ${subject}`,
    sourceFiles: changed.filter(isSource).sort(),
    ...(exemption ? { exemption } : {}),
    hasUnreleasedEntry: addsUnreleasedEntry(
      gitOrEmpty(["show", `${sha}:${CHANGELOG}`]),
      git([
        "diff-tree",
        "--no-commit-id",
        "--unified=0",
        "-p",
        "-r",
        sha,
        "--",
        CHANGELOG,
      ]),
    ),
  };
}

/**
 * Checks the working tree against HEAD, or every non-merge commit in `range`
 * (any revision range git accepts, e.g. `origin/main..HEAD`).
 */
export function checkChangelog(range?: string): ChangelogReport {
  const changeSets = range
    ? lines(git(["rev-list", "--no-merges", range]))
        .reverse()
        .map(commitChangeSet)
    : [workingTreeChangeSet()];

  const relevant = changeSets.filter((set) => set.sourceFiles.length > 0);

  return {
    scope: range ?? "working tree",
    examined: changeSets.length,
    exempt: relevant.flatMap((set) =>
      set.exemption ? [{ scope: set.scope, reason: set.exemption }] : [],
    ),
    missing: relevant
      .filter((set) => set.exemption === undefined && !set.hasUnreleasedEntry)
      .map((set) => ({ scope: set.scope, sourceFiles: set.sourceFiles })),
  };
}

/** One line per undecided change, naming the files that forced the decision. */
export function describeChangelogFailures(report: ChangelogReport): string[] {
  return report.missing.map(
    (miss) =>
      `${miss.scope}: touches ${miss.sourceFiles.join(", ")} with no entry under "## Unreleased" and no ${EXEMPTION_TRAILER} trailer`,
  );
}
