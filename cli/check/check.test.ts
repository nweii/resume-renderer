// Covers the judgements `check` makes: whether canonical content parses,
// whether a diff put an entry under `## Unreleased`, and whether package.json
// keeps pace with the newest changelog release.

import { describe, expect, test } from "bun:test";

import {
  addedLineNumbers,
  addsUnreleasedEntry,
  unreleasedRange,
} from "./changelog";
import { checkVariants, describeVariantFailures } from "./variants";
import { checkVersion, describeVersionFailures, latestRelease } from "./version";

const validVariant = {
  id: "sample",
  slug: "sample",
  pathname: "/sample" as const,
  resumeFile: "resumes/sample.json",
  templateId: "baseline" as const,
  themeId: "baseline" as const,
  resume: {
    header: {
      name: "Sample Person",
      subtitle: ["Line one"],
      contact: { email: "sample@example.com" },
    },
    sections: [{ kind: "skills", label: "Skills", bullets: ["One"] }],
  },
};

describe("variant validation", () => {
  test("passes the registered variants as shipped", async () => {
    const report = await checkVariants();

    expect(report.failures).toEqual([]);
    expect(report.checked).toContain("default");
  });

  test("names the file and the exact path of a bad field", async () => {
    const broken = {
      ...validVariant,
      resume: {
        ...validVariant.resume,
        sections: [{ kind: "skills", label: "Skills", bullets: [42] }],
      },
    };

    const report = await checkVariants([broken]);
    const [problem] = describeVariantFailures(report);

    expect(report.failures).toHaveLength(1);
    expect(problem).toContain("resumes/sample.json");
    expect(problem).toContain("sections.0.bullets.0");
  });

  test("reports a markdown variant by line and heading, not a JSON path", async () => {
    const broken = {
      ...validVariant,
      resumeFile: "resumes/sample.md",
      resume: [
        "---",
        "name: Sample Person",
        "subtitle:",
        "contact:",
        "  email: sample@example.com",
        "---",
        "",
        "## Experience",
        "",
        "- a bullet with no entry above it",
        "",
      ].join("\n"),
    };

    const [problem] = describeVariantFailures(await checkVariants([broken]));

    expect(problem).toContain("resumes/sample.md");
    expect(problem).toContain("line 10 (## Experience)");
    expect(problem).not.toContain("sections.");
  });

  test("validates a markdown variant through the schema like a JSON one", async () => {
    const markdown = {
      ...validVariant,
      resumeFile: "resumes/sample.md",
      resume: [
        "---",
        "name: Sample Person",
        "subtitle:",
        "  - Line one",
        "contact:",
        "  email: sample@example.com",
        "---",
        "",
        "## Skills",
        "",
        "- One",
        "",
      ].join("\n"),
    };

    expect((await checkVariants([markdown])).failures).toEqual([]);
  });

  test("names an unknown section kind rather than silently skipping it", async () => {
    const broken = {
      ...validVariant,
      resume: {
        ...validVariant.resume,
        sections: [{ kind: "publications", label: "Publications" }],
      },
    };

    const [problem] = describeVariantFailures(await checkVariants([broken]));

    expect(problem).toContain("sections.0.kind");
    expect(problem).toContain("No matching discriminator");
  });
});

const changelog = [
  "# Changelog", // 1
  "", // 2
  "## Unreleased", // 3
  "", // 4
  "### Added", // 5
  "", // 6
  "- A new thing.", // 7
  "", // 8
  "## 0.1.0 — 2026-08-09", // 9
  "", // 10
  "- The starting point.", // 11
].join("\n");

describe("changelog parsing", () => {
  test("bounds the Unreleased section at the next release heading", () => {
    expect(unreleasedRange(changelog)).toEqual({ start: 4, end: 8 });
  });

  test("reports no range when the section is absent", () => {
    expect(unreleasedRange("# Changelog\n\n## 0.1.0\n")).toBeNull();
  });

  test("reads added line numbers off unified=0 hunk headers", () => {
    const diff = [
      "--- a/CHANGELOG.md",
      "+++ b/CHANGELOG.md",
      "@@ -6,0 +7,2 @@",
      "+- A new thing.",
      "+- Another thing.",
    ].join("\n");

    expect(addedLineNumbers(diff)).toEqual([7, 8]);
  });

  test("accepts an addition inside the Unreleased section", () => {
    const diff = ["@@ -6,0 +7 @@", "+- A new thing."].join("\n");

    expect(addsUnreleasedEntry(changelog, diff)).toBe(true);
  });

  test("rejects an addition to an older release", () => {
    const diff = ["@@ -10,0 +11 @@", "+- The starting point."].join("\n");

    expect(addsUnreleasedEntry(changelog, diff)).toBe(false);
  });

  test("rejects an untouched changelog", () => {
    expect(addsUnreleasedEntry(changelog, "")).toBe(false);
  });
});

describe("version", () => {
  test("reads the newest release heading, skipping Unreleased", () => {
    expect(latestRelease("## Unreleased\n\n## 0.2.0 — 2026-09-07\n\n## 0.1.0 — 2026-08-09\n")).toBe("0.2.0");
    expect(latestRelease("## v1.0.0\n")).toBe("1.0.0");
    expect(latestRelease("## Unreleased\n")).toBeNull();
  });

  test("package.json matches the newest release as shipped", () => {
    expect(checkVersion().matches).toBe(true);
  });

  test("names both versions when they disagree", () => {
    const [problem] = describeVersionFailures({ version: "0.1.0", released: "0.2.0", matches: false });
    expect(problem).toContain("0.1.0");
    expect(problem).toContain("0.2.0");
    expect(problem).toContain("package.json");
  });
});
