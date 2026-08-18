// The `check` command: registered variants must parse against the schema, and
// a change that touches source files must carry a changelog decision.

import type { Cli } from "incur";
import { z } from "incur";

import {
  checkChangelog,
  describeChangelogFailures,
  EXEMPTION_TRAILER,
} from "./changelog";
import { checkVariants, describeVariantFailures } from "./variants";

export function registerCheck(cli: Cli.Cli) {
  return cli.command("check", {
    description:
      "Validate every registered variant against the schema and enforce the changelog contract.",
    options: z.object({
      range: z
        .string()
        .optional()
        .describe(
          "Git revision range to check the changelog contract over, e.g. origin/main..HEAD. Defaults to the working tree.",
        ),
    }),
    examples: [
      { description: "Check the working tree before committing" },
      {
        options: { range: "origin/main..HEAD" },
        description: "Check every commit a push would land",
      },
    ],
    run(c) {
      const variants = checkVariants();
      const changelog = checkChangelog(c.options.range);
      const problems = [
        ...describeVariantFailures(variants),
        ...describeChangelogFailures(changelog),
      ];

      // The envelope drops `hint`, so the message carries the whole report and
      // the way out of it.
      if (problems.length > 0)
        return c.error({
          code: "CHECK_FAILED",
          message: [
            `${problems.length} problem${problems.length === 1 ? "" : "s"}:`,
            ...problems.map((problem) => `  - ${problem}`),
            `Fix each path named above. A change that has nothing to port takes a "${EXEMPTION_TRAILER}: <reason>" trailer on its commit message instead of an entry.`,
          ].join("\n"),
          retryable: true,
        });

      return { variants, changelog };
    },
  });
}
