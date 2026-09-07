// The generated contract must cover every section kind in the union and mark
// optionality, and the staleness check must read the committed file honestly.

import { expect, test } from "bun:test";

import { checkContract } from "../check/contract";
import { renderContract } from "./generate";

test("contract covers every section kind with fields and optionality", async () => {
  const contract = await renderContract();
  expect(contract).toContain("## Section kinds (4)");
  for (const kind of ["skills", "projects", "experiences", "education"]) {
    expect(contract).toContain(`- ${kind}({`);
  }
  // Required vs optional fields keep their marks.
  expect(contract).toContain("label: string");
  expect(contract).toContain("dateRange?: string");
  // `.describe()` prose rides along.
  expect(contract).toContain("/* Provenance; not rendered */");
});

test("committed contract is fresh", async () => {
  expect((await checkContract()).fresh).toBe(true);
});
