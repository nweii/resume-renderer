// The version in package.json must match the newest released section of
// CHANGELOG.md. A release adds that section in its commit, so a release that
// forgets to bump package.json fails `check` before it is tagged, and
// `resume --version` (which reads package.json) never lags the tag.

import { existsSync, readFileSync } from "node:fs";

import { repoPath } from "../repo";

const PACKAGE = "package.json";
const CHANGELOG = "CHANGELOG.md";

export type VersionReport = {
  /** `version` in package.json. */
  version: string;
  /** The newest `## X.Y.Z` heading in the changelog; null when none has shipped. */
  released: string | null;
  matches: boolean;
};

/** The first versioned release heading, `## 0.2.0 — 2026-09-07` or bare `## 0.2.0`. */
export function latestRelease(changelog: string): string | null {
  return /^##\s+v?(\d+\.\d+\.\d+)\b/m.exec(changelog)?.[1] ?? null;
}

export function checkVersion(): VersionReport {
  const pkg = JSON.parse(readFileSync(repoPath(PACKAGE), "utf8")) as {
    version?: unknown;
  };
  const version = typeof pkg.version === "string" ? pkg.version : "";
  const changelogPath = repoPath(CHANGELOG);
  const released = existsSync(changelogPath)
    ? latestRelease(readFileSync(changelogPath, "utf8"))
    : null;
  return { version, released, matches: released === null || released === version };
}

/** One line, addressed to whoever is cutting the release. */
export function describeVersionFailures(report: VersionReport): string[] {
  if (report.matches) return [];
  return [
    `${PACKAGE} says ${report.version || "no version"} but the newest release in ${CHANGELOG} is ${report.released} — set "version" to ${report.released} in the release commit`,
  ];
}
