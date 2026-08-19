// Covers the pure parts of `setup`: the wrangler.jsonc name edit lands at
// its anchor, preserves comments, no-ops when nothing changes, and refuses a
// drifted file; the folder-name default is always a valid Worker name; and
// the stage plan is idempotent — a fully set-up state plans nothing.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import {
  defaultWorkerName,
  DriftError,
  planStages,
  readWorkerName,
  type SetupState,
  TEMPLATE_NAME,
  WORKER_NAME_PATTERN,
  writeWorkerName,
} from "./state";

const shipped = readFileSync(
  join(import.meta.dir, "..", "..", "wrangler.jsonc"),
  "utf8",
);

describe("worker name read/write", () => {
  test("reads the shipped template default", () => {
    expect(readWorkerName(shipped)).toBe(TEMPLATE_NAME);
  });

  test("writes a new name and preserves the comments", () => {
    const next = writeWorkerName(shipped, "jane-doe-resume");
    expect(readWorkerName(next)).toBe("jane-doe-resume");
    expect(next).toContain("custom domain");
    expect(next).toContain("compatibility_date");
  });

  test("no-ops when the name already matches", () => {
    const once = writeWorkerName(shipped, "jane-doe-resume");
    expect(writeWorkerName(once, "jane-doe-resume")).toBe(once);
  });

  test("names the drift when the anchor is missing", () => {
    expect(() => readWorkerName("{}")).toThrow(DriftError);
    expect(() => writeWorkerName("{}", "x")).toThrow(DriftError);
  });
});

describe("worker name validity", () => {
  test("accepts hyphenated lowercase names and rejects the rest", () => {
    expect(WORKER_NAME_PATTERN.test("jane-doe-resume")).toBe(true);
    expect(WORKER_NAME_PATTERN.test("a")).toBe(true);
    expect(WORKER_NAME_PATTERN.test("Jane")).toBe(false);
    expect(WORKER_NAME_PATTERN.test("-lead")).toBe(false);
    expect(WORKER_NAME_PATTERN.test("trail-")).toBe(false);
    expect(WORKER_NAME_PATTERN.test("a".repeat(64))).toBe(false);
  });

  test("derives a valid default from messy folder names", () => {
    expect(defaultWorkerName("resume-renderer")).toBe("resume-renderer");
    expect(defaultWorkerName("My Résumé (2026)")).toBe("my-r-sum-2026");
    expect(defaultWorkerName("日本語")).toBeNull();
    const long = defaultWorkerName("x".repeat(80));
    expect(long).not.toBeNull();
    expect(WORKER_NAME_PATTERN.test(long!)).toBe(true);
  });
});

describe("stage planning", () => {
  const done: SetupState = {
    workerName: "jane-doe-resume",
    needsName: false,
    authenticated: true,
    deployed: true,
  };

  test("a fresh copy plans every stage in order", () => {
    expect(
      planStages({
        workerName: TEMPLATE_NAME,
        needsName: true,
        authenticated: false,
        deployed: false,
      }),
    ).toEqual(["auth", "name", "deploy"]);
  });

  test("a fully set-up copy plans nothing — rerunning is idempotent", () => {
    expect(planStages(done)).toEqual([]);
  });

  test("each missing fact plans exactly its own repair", () => {
    expect(planStages({ ...done, authenticated: false, deployed: false })).toEqual([
      "auth",
      "deploy",
    ]);
    expect(planStages({ ...done, needsName: true })).toEqual(["name"]);
    expect(planStages({ ...done, deployed: false })).toEqual(["deploy"]);
  });
});
