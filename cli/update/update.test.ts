// Covers the judgements `update` makes without a network: which tags read as
// releases, how versions order, and which changelog section a release owns.

import { describe, expect, test } from "bun:test";

import { compareVersions, parseVersion, releaseSection } from ".";

describe("version parsing", () => {
  test("accepts tags with and without a v prefix", () => {
    expect(parseVersion("v0.2.0")).toEqual([0, 2, 0]);
    expect(parseVersion("0.2.0")).toEqual([0, 2, 0]);
  });

  test("rejects tags that are not releases", () => {
    expect(parseVersion("nightly")).toBeNull();
    expect(parseVersion("v0.2.0-rc1")).toBeNull();
  });

  test("orders numerically, not lexically", () => {
    expect(
      compareVersions(parseVersion("0.10.0")!, parseVersion("0.2.0")!),
    ).toBeGreaterThan(0);
  });
});

describe("release sections", () => {
  const changelog = [
    "# Changelog",
    "",
    "## Unreleased",
    "",
    "- pending",
    "",
    "## 0.2.0 — 2026-08-20",
    "",
    "### Added",
    "",
    "- **Kernel** · Breaking · Something.",
    "",
    "### Port",
    "",
    "Carry it across.",
    "",
    "## 0.1.0 — 2026-08-09",
    "",
    "- **All layers** · Not breaking · The start.",
  ].join("\n");

  test("returns one release's section with its bullets and port note", () => {
    const section = releaseSection(changelog, [0, 2, 0]);
    expect(section).toContain("## 0.2.0");
    expect(section).toContain("**Kernel** · Breaking");
    expect(section).toContain("Carry it across.");
    expect(section).not.toContain("0.1.0");
    expect(section).not.toContain("Unreleased");
  });

  test("the last section runs to the end of the file", () => {
    expect(releaseSection(changelog, [0, 1, 0])).toContain("The start.");
  });

  test("a version with no section is null", () => {
    expect(releaseSection(changelog, [9, 9, 9])).toBeNull();
  });
});

// The git-facing half, against a throwaway bare upstream with tagged
// releases and a downstream copy that diverged from it: which refs the fetch
// touches, where releases are read from, and where a fresh copy's review
// starts.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll } from "bun:test";

import {
  fetchUpstream,
  MARKER_FILE,
  newestRelease,
  readMarker,
  reviewUpstream,
  seedMarker,
  startingRelease,
  upstreamReleases,
} from ".";

const CLI = join(import.meta.dir, "..", "index.ts");

function sh(cwd: string, cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "fixture",
      GIT_AUTHOR_EMAIL: "fixture@example.com",
      GIT_COMMITTER_NAME: "fixture",
      GIT_COMMITTER_EMAIL: "fixture@example.com",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
  if (result.status !== 0)
    throw new Error(`${cmd} ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout;
}

const git = (cwd: string, ...args: string[]) =>
  sh(cwd, "git", ["-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", ...args]);

const section010 = ["## 0.1.0 — 2026-08-09", "", "- **All layers** · Not breaking · The start.", ""].join("\n");
const section020 = ["## 0.2.0 — 2026-08-20", "", "- **Kernel** · Not breaking · Only upstream says this.", ""].join("\n");

function release(dir: string, tag: string, changelog: string) {
  writeFileSync(join(dir, "CHANGELOG.md"), changelog);
  git(dir, "add", "CHANGELOG.md");
  git(dir, "commit", "-q", "-m", `Release ${tag}`);
  git(dir, "tag", "-a", tag, "-m", tag);
}

describe("against a diverged downstream of a tagged upstream", () => {
  let root: string;
  let upstream: string;
  let downstream: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "resume-update-"));
    upstream = join(root, "upstream");
    downstream = join(root, "downstream");

    git(root, "init", "-q", "-b", "main", upstream);
    release(upstream, "v0.1.0", `# Changelog\n\n## Unreleased\n\n${section010}`);

    // The copy: created from v0.1.0 as a template copy is, no tags of its
    // own from upstream, `origin` renamed to `upstream`. Then it diverges and
    // tags its own commit with a name upstream will also use.
    git(root, "clone", "-q", "--no-tags", upstream, downstream);
    git(downstream, "remote", "rename", "origin", "upstream");
    writeFileSync(join(downstream, "resume.txt"), "mine\n");
    git(downstream, "add", "resume.txt");
    git(downstream, "commit", "-q", "-m", "Diverge");
    git(downstream, "tag", "-a", "v0.2.0", "-m", "the copy's own v0.2.0");

    // Upstream moves on after the copy was made.
    release(
      upstream,
      "v0.2.0",
      `# Changelog\n\n## Unreleased\n\n${section020}\n${section010}`,
    );
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("fetches upstream's tags without touching the copy's own tag namespace", () => {
    expect(fetchUpstream(downstream)).toBe(true);
    const localTags = git(downstream, "tag", "--list").trim().split("\n");
    expect(localTags).toEqual(["v0.2.0"]);
  });

  test("reads releases and their sections from upstream's refs, not local tags", () => {
    const releases = upstreamReleases(downstream);
    expect(releases.map((release) => release.tag)).toEqual(["v0.1.0", "v0.2.0"]);
    expect(releases[1].section).toContain("Only upstream says this.");
  });

  test("a fresh copy starts at the release it was created from", () => {
    expect(newestRelease("# Changelog\n\n## Unreleased\n\n## 0.2.0 — x\n\n## 0.1.0")).toBe("v0.2.0");
    expect(newestRelease("# Changelog\n\n## Unreleased\n")).toBeNull();
    expect(startingRelease(downstream)).toBe("v0.1.0");
    // Without a marker the review still starts there, and writes nothing.
    expect(readMarker(downstream)).toBeNull();
    expect(reviewUpstream(downstream).reviewed).toBe("v0.1.0");
    expect(readMarker(downstream)).toBeNull();

    expect(seedMarker(downstream)).toBe("v0.1.0");
    expect(readFileSync(join(downstream, MARKER_FILE), "utf8")).toBe("v0.1.0\n");
    expect(seedMarker(downstream)).toBeNull();
    expect(readMarker(downstream)).toBe("v0.1.0");
  });

  test("the command lists only what came after, each section once", () => {
    const output = sh(downstream, "bun", ["run", CLI, "update", "--format", "json"]);
    const result = JSON.parse(output);
    expect(result.status).toBe("releases-to-review");
    expect(result.reviewed).toBe("v0.1.0");
    expect(result.releases.map((release: { tag: string }) => release.tag)).toEqual(["v0.2.0"]);
    expect(result.releases[0].section).toContain("Only upstream says this.");
    expect(result.message).not.toContain("Only upstream says this.");
    expect(result.message).toContain("--reviewed v0.2.0");
  });
});
