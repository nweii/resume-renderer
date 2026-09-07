// The `update` command: fetch the upstream remote, compare its tagged
// releases against the last-reviewed marker, and print the changelog section
// of every release not yet reviewed, oldest first, for the operating agent to
// judge and port. It gathers and summarizes; it never applies anything.
//
// The marker is a per-copy dotfile (gitignored). It names the newest release
// the operator reviewed, whether or not anything was adopted. A copy starts
// current: `setup` seeds the marker with the release the copy was created
// from, read off the copy's own CHANGELOG.md, and a first `update` on a copy
// without one seeds it the same way. Being behind upstream is information,
// never an error — every path exits zero.
//
// Upstream's tags stay in their own ref namespace
// (`refs/remotes/upstream/tags/*`), never in the copy's `refs/tags/*`, so a
// copy's own version-shaped tags are not mistaken for releases, a name shared
// with an upstream release does not make the fetch fail, and `git push --tags`
// from the copy never publishes upstream's tags as its own.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Cli } from "incur";
import { z } from "incur";

const CHANGELOG = "CHANGELOG.md";

/** The remote a downstream points at this repo, per the README setup steps. */
export const UPSTREAM_REMOTE = "upstream";

/** Where upstream's tags land locally: outside the copy's own tag namespace. */
const UPSTREAM_TAGS = `refs/remotes/${UPSTREAM_REMOTE}/tags`;

/** Per-copy state: the newest upstream release the operator has reviewed. */
export const MARKER_FILE = ".upstream-reviewed";

export type Release = {
  tag: string;
  version: number[];
  /** The release's own changelog section, verbatim: layer and breaking bullets plus the port note. */
  section: string;
};

/** `v0.2.0` or `0.2.0` → `[0, 2, 0]`; anything unparseable is skipped. */
export function parseVersion(tag: string): number[] | null {
  const match = /^v?(\d+(?:\.\d+)*)$/.exec(tag.trim());
  if (!match) return null;
  return match[1].split(".").map(Number);
}

export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** A `## <version>` changelog heading, with or without a date suffix. */
const RELEASE_HEADING = /^##\s+v?([\d.]+)\b/;

/**
 * The changelog section belonging to `version`: from its `## <version>`
 * heading up to the next `## ` heading or the end of the file. The heading may
 * carry a date suffix (`## 0.1.0 — 2026-08-09`).
 */
export function releaseSection(
  changelog: string,
  version: number[],
): string | null {
  const wanted = version.join(".");
  const fileLines = changelog.split("\n");
  const headingIndex = fileLines.findIndex((line) => {
    const heading = RELEASE_HEADING.exec(line);
    return heading !== null && heading[1] === wanted;
  });
  if (headingIndex === -1) return null;

  const rest = fileLines.slice(headingIndex + 1);
  const nextHeading = rest.findIndex((line) => /^##\s/.test(line));
  const end =
    nextHeading === -1 ? fileLines.length : headingIndex + 1 + nextHeading;

  return fileLines.slice(headingIndex, end).join("\n").trimEnd();
}

/**
 * The newest released version a changelog names, as a tag (`v0.2.0`), or
 * null when it has no release heading. Sections are newest-first, so this is
 * the first `## <version>` heading; `## Unreleased` does not match.
 */
export function newestRelease(changelog: string): string | null {
  for (const line of changelog.split("\n")) {
    const heading = RELEASE_HEADING.exec(line);
    if (heading) return `v${heading[1]}`;
  }
  return null;
}

function git(
  args: string[],
  cwd: string,
): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function hasUpstreamRemote(cwd = process.cwd()): boolean {
  return git(["remote"], cwd)
    .stdout.split("\n")
    .some((name) => name.trim() === UPSTREAM_REMOTE);
}

/**
 * Fetch upstream's tags into their own namespace. `--no-tags` stops git from
 * also copying them into the copy's `refs/tags/*`. False when the remote is
 * unreachable.
 */
export function fetchUpstream(cwd = process.cwd()): boolean {
  return git(
    [
      "fetch",
      "--no-tags",
      UPSTREAM_REMOTE,
      `+refs/tags/*:${UPSTREAM_TAGS}/*`,
    ],
    cwd,
  ).ok;
}

/** Upstream's fetched tags with a parseable version, oldest first. */
export function upstreamReleases(cwd = process.cwd()): Release[] {
  const tags = git(
    ["for-each-ref", "--format=%(refname:strip=4)", UPSTREAM_TAGS],
    cwd,
  )
    .stdout.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return tags
    .flatMap((tag) => {
      const version = parseVersion(tag);
      if (!version) return [];
      const shown = git(["show", `${UPSTREAM_TAGS}/${tag}:${CHANGELOG}`], cwd);
      if (!shown.ok) return [];
      const section = releaseSection(shown.stdout, version);
      if (!section) return [];
      return [{ tag, version, section }];
    })
    .sort((a, b) => compareVersions(a.version, b.version));
}

export function readMarker(cwd = process.cwd()): string | null {
  const path = join(cwd, MARKER_FILE);
  if (!existsSync(path)) return null;
  const tag = readFileSync(path, "utf8").trim();
  return tag.length > 0 ? tag : null;
}

/**
 * The release this copy was created from: the newest release heading in its
 * own CHANGELOG.md, which the template copy carries verbatim. Null when the
 * copy has no changelog or it names no release.
 */
export function startingRelease(cwd = process.cwd()): string | null {
  const path = join(cwd, CHANGELOG);
  if (!existsSync(path)) return null;
  return newestRelease(readFileSync(path, "utf8"));
}

/**
 * Write the marker with the starting release when no marker exists, so the
 * first review starts after the release the copy already has. Returns the tag
 * written, or null when a marker was already present or nothing could seed
 * it.
 */
export function seedMarker(cwd = process.cwd()): string | null {
  if (readMarker(cwd)) return null;
  const tag = startingRelease(cwd);
  if (!tag) return null;
  writeFileSync(join(cwd, MARKER_FILE), `${tag}\n`);
  return tag;
}

export type UpstreamReview = {
  /** True when the fetch failed; releases then come from the last successful fetch. */
  offline: boolean;
  /** The marker, or the starting release read from the changelog when no marker exists. */
  reviewed: string | null;
  /** Releases newer than `reviewed`, oldest first. */
  releases: Release[];
};

/** Fetch upstream and gather the releases not yet reviewed. Writes nothing. */
export function reviewUpstream(cwd = process.cwd()): UpstreamReview {
  const offline = !fetchUpstream(cwd);
  const reviewed = readMarker(cwd) ?? startingRelease(cwd);
  const reviewedVersion = reviewed ? parseVersion(reviewed) : null;
  const releases = upstreamReleases(cwd).filter(
    (release) =>
      !reviewedVersion ||
      compareVersions(release.version, reviewedVersion) > 0,
  );
  return { offline, reviewed, releases };
}

export function registerUpdate(cli: Cli.Cli) {
  return cli.command("update", {
    description:
      "Fetch the upstream remote and print the changelog section of every release newer than the last-reviewed marker, oldest first, for review and porting. Never applies anything.",
    options: z.object({
      reviewed: z
        .string()
        .optional()
        .describe(
          `Record a release tag as reviewed (adopted or declined) in ${MARKER_FILE}, e.g. v0.2.0. Later runs only report releases newer than it.`,
        ),
    }),
    examples: [
      { description: "List upstream releases not yet reviewed" },
      {
        options: { reviewed: "v0.2.0" },
        description: "Record that releases through v0.2.0 were reviewed",
      },
    ],
    run(c) {
      if (c.options.reviewed !== undefined) {
        const version = parseVersion(c.options.reviewed);
        if (!version)
          return c.error({
            code: "BAD_TAG",
            message: `"${c.options.reviewed}" is not a release tag. Pass one like v0.2.0.`,
            retryable: true,
          });
        writeFileSync(MARKER_FILE, `${c.options.reviewed.trim()}\n`);
        return {
          reviewed: c.options.reviewed,
          marker: MARKER_FILE,
          message: `Recorded ${c.options.reviewed} as reviewed. Later runs report only newer releases.`,
        };
      }

      if (!hasUpstreamRemote())
        return {
          status: "no-upstream-remote",
          message: `No "${UPSTREAM_REMOTE}" remote. Add one pointing at the repo this copy came from (git remote add ${UPSTREAM_REMOTE} <url>) to review its releases. Nothing is wrong.`,
        };

      // A copy that was never reviewed starts at the release it came from.
      seedMarker();
      const { offline, reviewed: marker, releases } = reviewUpstream();

      if (offline && releases.length === 0)
        return {
          status: "offline",
          message: `Could not reach "${UPSTREAM_REMOTE}" (offline or unreachable) and nothing previously fetched awaits review. Try again with a connection. Nothing is wrong.`,
        };

      if (releases.length === 0)
        return {
          status: "up-to-date",
          reviewed: marker,
          message: marker
            ? `Nothing new since ${marker}, the last release reviewed.`
            : "Upstream has no releases to review yet.",
        };

      // The sections travel once, in `releases`; the message only summarizes
      // and says what to do next.
      return {
        status: "releases-to-review",
        ...(offline
          ? {
              warning: `Could not reach "${UPSTREAM_REMOTE}"; showing releases from the last successful fetch.`,
            }
          : {}),
        reviewed: marker,
        releases: releases.map(({ tag, section }) => ({ tag, section })),
        message: [
          marker
            ? `${releases.length} release${releases.length === 1 ? "" : "s"} since ${marker}, the last release reviewed, oldest first: ${releases.map((release) => release.tag).join(", ")}.`
            : `${releases.length} release${releases.length === 1 ? "" : "s"} never reviewed, oldest first: ${releases.map((release) => release.tag).join(", ")}.`,
          `Each release's changelog section is in releases[].section. Judge each entry by its layer and port note, apply what this copy wants, then record the review — adopted or declined — with: resume update --reviewed ${releases[releases.length - 1].tag}`,
        ].join("\n"),
      };
    },
  });
}
