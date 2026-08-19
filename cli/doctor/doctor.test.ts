// The classifications `doctor` hangs its findings on: reading wrangler.jsonc,
// telling an unauthenticated wrangler from an unreachable one, and telling a
// never-deployed Worker from a broken probe.

import { describe, expect, test } from "bun:test";

import {
  checkWranglerConfig,
  classifyDeployments,
  classifyWhoami,
  describeFindings,
  isNetworkFailure,
  parseJsonc,
} from "./checks";

describe("checkWranglerConfig", () => {
  const good = `{
  // comment
  "name": "my-resume",
  "compatibility_date": "2026-08-09",
  "assets": { "directory": "./out" },
}`;

  test("accepts the shipped config shape, comments and trailing commas included", () => {
    const finding = checkWranglerConfig(good);
    expect(finding.status).toBe("ok");
    expect(finding.detail).toContain("my-resume");
  });

  test("a missing file is a problem with a restore remedy", () => {
    const finding = checkWranglerConfig(null);
    expect(finding.status).toBe("problem");
    expect(finding.remedy).toContain("wrangler.jsonc");
  });

  test("unparseable JSONC is a problem naming the syntax", () => {
    const finding = checkWranglerConfig("{ not json");
    expect(finding.status).toBe("problem");
    expect(finding.remedy).toContain("syntax");
  });

  test("a config without a name is a problem", () => {
    const finding = checkWranglerConfig(
      '{ "assets": { "directory": "./out" } }',
    );
    expect(finding.status).toBe("problem");
    expect(finding.remedy).toContain("`name`");
  });

  test("a config without an assets directory is a problem", () => {
    const finding = checkWranglerConfig('{ "name": "my-resume" }');
    expect(finding.status).toBe("problem");
    expect(finding.remedy).toContain("assets");
  });
});

describe("parseJsonc", () => {
  test("strips block comments", () => {
    expect(parseJsonc('{ /* a */ "a": 1 }')).toEqual({ a: 1 });
  });
});

describe("classifyWhoami", () => {
  test("a successful whoami is ok and names the account", () => {
    const finding = classifyWhoami({
      ok: true,
      output:
        "Getting User settings...\nYou are logged in with an OAuth Token, associated with the email user@example.com.",
    });
    expect(finding.status).toBe("ok");
    expect(finding.detail).toContain("user@example.com");
  });

  test("an auth failure is a problem carrying the way in", () => {
    const finding = classifyWhoami({
      ok: false,
      output: "You must use `wrangler login` before continuing.",
    });
    expect(finding.status).toBe("problem");
    expect(finding.remedy).toContain("wrangler login");
  });

  test("a network failure skips instead of failing", () => {
    const finding = classifyWhoami({
      ok: false,
      output: "getaddrinfo ENOTFOUND api.cloudflare.com",
    });
    expect(finding.status).toBe("skipped");
    expect(finding.remedy).toBeUndefined();
  });
});

describe("classifyDeployments", () => {
  test("a listing that works means the Worker exists", () => {
    expect(
      classifyDeployments({ ok: true, output: "Created: 2026-08-10" }).status,
    ).toBe("ok");
  });

  test("a Worker that was never deployed is information, not a problem", () => {
    const finding = classifyDeployments({
      ok: false,
      output:
        "workers.api.error.service_not_found [code: 10007]: could not find service",
    });
    expect(finding.status).toBe("info");
    expect(finding.detail).toContain("resume deploy");
  });

  test("a network failure skips instead of failing", () => {
    expect(
      classifyDeployments({ ok: false, output: "fetch failed" }).status,
    ).toBe("skipped");
  });
});

describe("isNetworkFailure", () => {
  test("ignores an ordinary error", () => {
    expect(isNetworkFailure("A request to the API failed [code: 10001]")).toBe(
      false,
    );
  });
});

describe("describeFindings", () => {
  test("attaches the remedy to its finding", () => {
    const lines = describeFindings([
      { check: "a", status: "ok", detail: "fine" },
      { check: "b", status: "problem", detail: "broken", remedy: "fix it" },
    ]);
    expect(lines[0]).toBe("[ok] a: fine");
    expect(lines[1]).toContain("Fix: fix it");
  });
});
