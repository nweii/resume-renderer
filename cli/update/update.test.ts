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
