// The `variant` command group: manages the document collection. `create`
// scaffolds a schema-valid content file and registers it; `list` reads the
// registry back. Deleting a variant is manual at this stage — reverse the
// three edits `create` makes (content file, registry entry, .gitignore line).

import { Cli, z } from "incur";

import { resumeVariants } from "@/lib/resume-variants";
import { resumeTemplates, type ResumeTemplateId } from "@/templates";

import { createVariant, DriftError } from "./create";

const templateIds = Object.keys(resumeTemplates) as [
  ResumeTemplateId,
  ...ResumeTemplateId[],
];

export function registerVariant(cli: Cli.Cli) {
  const variant = Cli.create("variant", {
    description:
      "Manage the document collection: create variants and list what is registered.",
  })
    .command("create", {
      description:
        "Scaffold a schema-valid content file, register it in lib/resume-variants.ts, and un-ignore it so the new route builds.",
      args: z.object({
        slug: z
          .string()
          .describe("URL slug for the new variant, e.g. backend-staff"),
      }),
      options: z.object({
        template: z
          .enum(templateIds)
          .default("baseline")
          .describe("Template id the variant binds to"),
      }),
      examples: [
        {
          args: { slug: "backend-staff" },
          description: "Scaffold a variant rendered at /backend-staff",
        },
      ],
      run(c) {
        try {
          return createVariant(c.args.slug, c.options.template);
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
      description: "List every registered variant with its slug and template.",
      run() {
        return Object.values(resumeVariants).map((entry) => ({
          slug: entry.slug,
          template: entry.templateId,
        }));
      },
    });

  return cli.command(variant);
}
