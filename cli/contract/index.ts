// The `contract` command: writes the agent-facing content contract derived
// from the schema. `check` compares the committed file against a fresh render
// and fails while they differ.

import { writeFileSync } from "node:fs";

import type { Cli } from "incur";

import { repoPath } from "../repo";
import { CONTRACT_FILE, renderContract } from "./generate";

export function registerContract(cli: Cli.Cli) {
  return cli.command("contract", {
    description: `Regenerate ${CONTRACT_FILE} from the schema in lib/schema.ts.`,
    examples: [
      { description: "Regenerate the contract after editing the schema" },
    ],
    async run() {
      const content = await renderContract();
      writeFileSync(repoPath(CONTRACT_FILE), content);
      return { file: CONTRACT_FILE, bytes: content.length };
    },
  });
}
