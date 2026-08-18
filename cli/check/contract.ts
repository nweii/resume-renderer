// Compares the committed schema contract against a fresh render from the
// schema. A schema edit without a regeneration fails here, so the document
// agents read never drifts from what the validator enforces.

import { existsSync, readFileSync } from "node:fs";

import {
  CONTRACT_FILE,
  CONTRACT_PATH,
  renderContract,
} from "../contract/generate";

export type ContractReport = {
  file: string;
  fresh: boolean;
};

export function checkContract(): ContractReport {
  const committed = existsSync(CONTRACT_PATH)
    ? readFileSync(CONTRACT_PATH, "utf8")
    : undefined;
  return { file: CONTRACT_FILE, fresh: committed === renderContract() };
}

/** One line, addressed to whoever edited the schema. */
export function describeContractFailures(report: ContractReport): string[] {
  if (report.fresh) return [];
  return [
    `${report.file} is stale against lib/schema.ts — run \`bun run cli contract\` and commit the result`,
  ];
}
