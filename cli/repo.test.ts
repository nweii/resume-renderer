// Runs the CLI from this checkout against a scratch repo elsewhere, the way a
// copy that predates the CLI runs it (`cd <copy> && bun run
// <template>/cli/index.ts ...`), and confirms each command reads that repo —
// its registry, its content, its files — rather than this one.

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { resumeToMarkdown } from "@/lib/resume-markdown";

import {
  addVariantToGitignore,
  addVariantToRegistry,
  scaffoldResume,
} from "./variant/create";

const CLI_ROOT = join(import.meta.dir, "..");
const CLI = join(CLI_ROOT, "cli", "index.ts");

/** What a copy carries and the CLI reads. Everything else stays behind. */
const COPIED = [
  "lib",
  "templates",
  "resumes/default.json",
  "docs/schema-contract.md",
  "tsconfig.json",
  "bunfig.toml",
  "CHANGELOG.md",
  "package.json",
  ".gitignore",
];

let scratch: string;

function run(args: string[], cwd: string = scratch) {
  const result = spawnSync("bun", ["run", CLI, ...args, "--format", "json"], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    json: () => JSON.parse(result.stdout) as Record<string, unknown>,
  };
}

function git(args: string[]) {
  const result = spawnSync(
    "git",
    ["-c", "user.name=scratch", "-c", "user.email=scratch@example.com", ...args],
    { cwd: scratch, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "resume-scratch-"));
  for (const entry of COPIED) {
    mkdirSync(dirname(join(scratch, entry)), { recursive: true });
    cpSync(join(CLI_ROOT, entry), join(scratch, entry), { recursive: true });
  }
  symlinkSync(join(CLI_ROOT, "node_modules"), join(scratch, "node_modules"));

  // A second variant, in markdown, that this checkout does not have.
  writeFileSync(join(scratch, "resumes", "second.md"), resumeToMarkdown(scaffoldResume("second")));
  const registry = join(scratch, "lib", "resume-variants.ts");
  writeFileSync(registry, addVariantToRegistry(readFileSync(registry, "utf8"), "second", "baseline", "md"));
  const gitignore = join(scratch, ".gitignore");
  writeFileSync(gitignore, addVariantToGitignore(readFileSync(gitignore, "utf8"), "second", "md"));

  git(["init", "-q"]);
  git(["add", "-A"]);
  git(["commit", "-qm", "Scratch copy"]);
});

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("run from another repo", () => {
  test("check reads the scratch repo's registry, from its root and from a subdirectory", () => {
    for (const cwd of [scratch, join(scratch, "resumes")]) {
      const result = run(["check"], cwd);
      expect(result.output.trim()).not.toContain("CHECK_FAILED");
      expect(result.status).toBe(0);
      const report = result.json() as { variants: { checked: string[] }; version: { matches: boolean } };
      expect(report.variants.checked).toEqual(["default", "second"]);
      expect(report.version.matches).toBe(true);
    }
  });

  test("variant list reads the scratch repo's registry", () => {
    const result = run(["variant", "list"]);
    expect(result.status).toBe(0);
    expect(result.json()).toEqual([
      { slug: "default", template: "baseline", theme: "baseline" },
      { slug: "second", template: "baseline", theme: "baseline" },
    ]);
  });

  test("check reports the scratch repo's broken content by its own file", () => {
    const file = join(scratch, "resumes", "second.md");
    const good = readFileSync(file, "utf8");
    writeFileSync(file, good.replace("## Skills", "## Mystery"));
    const result = run(["check"]);
    writeFileSync(file, good);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain("resumes/second.md");
  });

  test("variant create writes into the scratch repo with the theme asked for", () => {
    const result = run(["variant", "create", "third", "--theme", "night"]);
    expect(result.status).toBe(0);

    expect(existsSync(join(scratch, "resumes", "third.json"))).toBe(true);
    expect(existsSync(join(CLI_ROOT, "resumes", "third.json"))).toBe(false);
    const registry = readFileSync(join(scratch, "lib", "resume-variants.ts"), "utf8");
    expect(registry).toContain('templateId: "baseline",\n    themeId: "night",');
    expect(readFileSync(join(CLI_ROOT, "lib", "resume-variants.ts"), "utf8")).not.toContain("third");
  });

  test("variant create refuses a template the scratch repo does not register", () => {
    const result = run(["variant", "create", "fourth", "--template", "playroom"]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain("not a registered template");
    expect(existsSync(join(scratch, "resumes", "fourth.json"))).toBe(false);
  });
});
