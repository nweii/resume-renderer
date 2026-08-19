// The `update` command: fetch the upstream remote, compare its tagged
// releases against the last-reviewed marker, and print the changelog section
// of every release not yet reviewed, oldest first, for the operating agent to
// judge and port. It gathers and summarizes; it never applies anything.
//
// The marker is a per-copy dotfile (gitignored). An absent file means no
// release has ever been reviewed; a present file names the newest release the
// operator reviewed, whether or not anything was adopted. Being behind
// upstream is information, never an error — every path exits zero.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import type { Cli } from "incur";
import { z } from "incur";

const CHANGELOG = "CHANGELOG.md";

/** The remote a downstream points at this repo, per the README setup steps. */
export const UPSTREAM_REMOTE = "upstream";

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
    const heading = /^##\s+v?([\d.]+)\b/.exec(line);
    return heading !== null && heading[1] === wanted;
  });
  if (headingIndex === -1) return null;

  const rest = fileLines.slice(headingIndex + 1);
  const nextHeading = rest.findIndex((line) => /^##\s/.test(line));
  const end =
    nextHeading === -1 ? fileLines.length : headingIndex + 1 + nextHeading;

  return fileLines.slice(headingIndex, end).join("\n").trimEnd();
}

function git(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function hasUpstreamRemote(): boolean {
  return git(["remote"])
    .stdout.split("\n")
    .some((name) => name.trim() === UPSTREAM_REMOTE);
}

/** Upstream's tags with a parseable version, oldest first. */
export function upstreamReleases(): Release[] {
  const tags = git(["tag", "--list"])
    .stdout.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return tags
    .flatMap((tag) => {
      const version = parseVersion(tag);
      if (!version) return [];
      const shown = git(["show", `${tag}:${CHANGELOG}`]);
      if (!shown.ok) return [];
      const section = releaseSection(shown.stdout, version);
      if (!section) return [];
      return [{ tag, version, section }];
    })
    .sort((a, b) => compareVersions(a.version, b.version));
}

export function readMarker(): string | null {
  if (!existsSync(MARKER_FILE)) return null;
  const tag = readFileSync(MARKER_FILE, "utf8").trim();
  return tag.length > 0 ? tag : null;
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

      const fetch = git(["fetch", "--tags", UPSTREAM_REMOTE]);
      const offline = !fetch.ok;

      const marker = readMarker();
      const markerVersion = marker ? parseVersion(marker) : null;
      const releases = upstreamReleases().filter(
        (release) =>
          !markerVersion ||
          compareVersions(release.version, markerVersion) > 0,
      );

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
            ? `${releases.length} release${releases.length === 1 ? "" : "s"} since ${marker}, oldest first.`
            : `${releases.length} release${releases.length === 1 ? "" : "s"} never reviewed, oldest first.`,
          "",
          ...releases.map((release) => release.section + "\n"),
          `Judge each entry by its layer and port note, apply what this copy wants, then record the review — adopted or declined — with: resume update --reviewed ${releases[releases.length - 1].tag}`,
        ].join("\n"),
      };
    },
  });
}
