// The `variant` command group: manages the document collection. `create`
// scaffolds a schema-valid content file and registers it; `list` reads the
// registry back. Both read the repo at the working directory's git root.
// Deleting a variant is manual at this stage — reverse the three edits
// `create` makes (content file, registry entry, .gitignore line).

import { Cli, z } from "incur";

import { loadRepoModule } from "../repo";

import { createVariant, DriftError } from "./create";

export function registerVariant(cli: Cli.Cli) {
  const variant = Cli.create("variant", {
    description:
      "Manage the document collection: create variants and list what is registered.",
  })
    .command("create", {
      description:
        "Scaffold a schema-valid content file (JSON, or markdown in the dialect), register it in lib/resume-variants.ts, and un-ignore it so the new route builds.",
      args: z.object({
        slug: z
          .string()
          .describe("URL slug for the new variant, e.g. backend-staff"),
      }),
      options: z.object({
        // A string, not an enum: the registered templates are the target
        // repo's, read at run time, so the command validates against those.
        template: z
          .string()
          .default("baseline")
          .describe("Template id the variant binds to, as registered in templates/index.ts"),
        theme: z
          .string()
          .optional()
          .describe("Theme id the variant binds to (a data-resume-theme value). Defaults to the template id."),
        // Not `--format`: incur reserves that for its own output format.
        markdown: z
          .boolean()
          .default(false)
          .describe("Write the content file as markdown in the dialect (docs/markdown-dialect.md) instead of JSON"),
      }),
      examples: [
        {
          args: { slug: "backend-staff" },
          description: "Scaffold a variant rendered at /backend-staff",
        },
        {
          args: { slug: "backend-staff" },
          options: { markdown: true },
          description: "Scaffold the same variant with a markdown content file",
        },
        {
          args: { slug: "backend-staff" },
          options: { template: "playroom", theme: "playroom-dark" },
          description: "Bind another template and a theme other than the template's own",
        },
      ],
      async run(c) {
        try {
          return await createVariant(
            c.args.slug,
            c.options.template,
            c.options.markdown ? "md" : "json",
            c.options.theme ?? c.options.template,
          );
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          return c.error({
            code: error instanceof DriftError ? "REGISTRY_DRIFT" : "CREATE_FAILED",
            message: error.message,
            retryable: false,
          });
        }
      },
    })
    .command("list", {
      description: "List every registered variant with its slug, template, and theme.",
      async run() {
        const { resumeVariants } = await loadRepoModule<
          typeof import("@/lib/resume-variants")
        >("lib/resume-variants.ts");
        return Object.values(resumeVariants).map((entry) => ({
          slug: entry.slug,
          template: entry.templateId,
          theme: entry.themeId,
        }));
      },
    });

  return cli.command(variant);
}
