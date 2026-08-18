// The `contract` command: writes the agent-facing content contract derived
// from the schema. `check` compares the committed file against a fresh render
// and fails while they differ.

import { writeFileSync } from "node:fs";

import type { Cli } from "incur";

import { CONTRACT_FILE, CONTRACT_PATH, renderContract } from "./generate";

export function registerContract(cli: Cli.Cli) {
  return cli.command("contract", {
    description: `Regenerate ${CONTRACT_FILE} from the schema in lib/schema.ts.`,
    examples: [
      { description: "Regenerate the contract after editing the schema" },
    ],
    run() {
      const content = renderContract();
      writeFileSync(CONTRACT_PATH, content);
      return { file: CONTRACT_FILE, bytes: content.length };
    },
  });
}
