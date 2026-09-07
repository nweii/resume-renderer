// Compares the committed schema contract against a fresh render from the
// schema. A schema edit without a regeneration fails here, so the document
// agents read never drifts from what the validator enforces.

import { existsSync, readFileSync } from "node:fs";

import { CONTRACT_FILE, renderContract } from "../contract/generate";
import { repoPath } from "../repo";

export type ContractReport = {
  file: string;
  fresh: boolean;
};

export async function checkContract(): Promise<ContractReport> {
  const path = repoPath(CONTRACT_FILE);
  const committed = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  return { file: CONTRACT_FILE, fresh: committed === (await renderContract()) };
}

/** One line, addressed to whoever edited the schema. */
export function describeContractFailures(report: ContractReport): string[] {
  if (report.fresh) return [];
  return [
    `${report.file} is stale against lib/schema.ts — run \`bun run cli contract\` and commit the result`,
  ];
}
