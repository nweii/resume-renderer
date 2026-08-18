// Covers the pure parts of `variant create`: the scaffold parses against the
// schema, and the registry and .gitignore edits land at their anchors, stay
// idempotent, and refuse a drifted file.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { resumeSchema } from "@/lib/schema";

import {
  addVariantToGitignore,
  addVariantToRegistry,
  DriftError,
  scaffoldResume,
  slugToIdentifier,
  SLUG_PATTERN,
} from "./create";

const registrySource = readFileSync(
  join(import.meta.dir, "..", "..", "lib", "resume-variants.ts"),
  "utf8",
);

describe("scaffold", () => {
  test("parses against the schema", () => {
    expect(() => resumeSchema.parse(scaffoldResume("backend-staff"))).not.toThrow();
  });
});

describe("slug handling", () => {
  test("accepts hyphenated slugs and rejects the rest", () => {
    expect(SLUG_PATTERN.test("backend-staff")).toBe(true);
    expect(SLUG_PATTERN.test("Backend")).toBe(false);
    expect(SLUG_PATTERN.test("a--b")).toBe(false);
    expect(SLUG_PATTERN.test("-a")).toBe(false);
  });

  test("derives a valid identifier even from a digit-led slug", () => {
    expect(slugToIdentifier("backend-staff")).toBe("resumeBackendStaff");
    expect(slugToIdentifier("2026-intern")).toBe("resume2026Intern");
  });
});

describe("registry edit", () => {
  test("adds an import and an entry to the shipped registry source", () => {
    const next = addVariantToRegistry(registrySource, "backend-staff", "baseline");

    expect(next).toContain(
      'import resumeBackendStaff from "@/resumes/backend-staff.json";',
    );
    expect(next).toContain('resumeFile: "resumes/backend-staff.json"');
    expect(next.indexOf('slug: "backend-staff"')).toBeLessThan(
      next.indexOf("} satisfies Record<string, ResumeVariant>;"),
    );
  });

  test("refuses a slug that is already registered", () => {
    expect(() => addVariantToRegistry(registrySource, "default", "baseline")).toThrow(
      "already registered",
    );
  });

  test("names the drift when an anchor is missing", () => {
    expect(() => addVariantToRegistry("// empty file", "x", "baseline")).toThrow(
      DriftError,
    );
  });
});

describe("gitignore edit", () => {
  const gitignore = "resumes/*.json\n!resumes/default.json\n";

  test("adds the un-ignore line after the default one", () => {
    expect(addVariantToGitignore(gitignore, "backend-staff")).toBe(
      "resumes/*.json\n!resumes/default.json\n!resumes/backend-staff.json\n",
    );
  });

  test("no-ops when the line already exists", () => {
    const once = addVariantToGitignore(gitignore, "backend-staff");
    expect(addVariantToGitignore(once, "backend-staff")).toBe(once);
  });

  test("names the drift when the anchor is missing", () => {
    expect(() => addVariantToGitignore("node_modules/", "x")).toThrow(DriftError);
  });
});
