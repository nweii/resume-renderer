#!/usr/bin/env bun
// The repo's operator CLI. An agent is the primary caller, so every command
// returns structured data and fails with a message naming what to fix.
//
// Each command lives in its own folder under `cli/` and exports a `register`
// function. A command that grows subcommands becomes its own `Cli.create`
// group inside that function; nothing else here changes.

import { Cli } from "incur";

import { registerCheck } from "./check";
import { registerContract } from "./contract";
import { registerDeploy, registerPreview } from "./deploy";
import { registerUpdate } from "./update";
import { registerVariant } from "./variant";

const cli = Cli.create("resume", {
  version: "0.1.0",
  description:
    "Operate the resume renderer: validate content and the changelog contract, and review upstream releases.",
  sync: {
    // Bundled agent skills live in `skills/`, one folder per skill, and
    // install alongside the generated command skills via `skills add`.
    include: ["skills/*"],
    suggestions: [
      "check the resume repo before I commit",
      "check every commit on this branch against the changelog contract",
    ],
  },
});

registerCheck(cli);
registerContract(cli);
registerDeploy(cli);
registerPreview(cli);
registerUpdate(cli);
registerVariant(cli);

cli.serve();
