// Scaffolds a new variant: a schema-valid content file (JSON, or markdown in
// the dialect), a registry entry in lib/resume-variants.ts, the .gitignore
// un-ignore line that keeps the file tracked, and therefore a rendering route.
// The registry and .gitignore edits are anchor-based and refuse to run when
// either file has drifted from the shape they expect.

import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { resumeSchema, type Resume } from "@/lib/schema";

import { loadRepoModule, repoPath } from "../repo";

export const REGISTRY_FILE = "lib/resume-variants.ts";
export const GITIGNORE_FILE = ".gitignore";
export const TEMPLATES_FILE = "templates/index.ts";

/** The content file's format, by extension. `md` follows docs/markdown-dialect.md. */
export type ContentFormat = "json" | "md";

/** URL-safe slugs only: lowercase words separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `backend-staff` → `resumeBackendStaff`, always a valid identifier. */
export function slugToIdentifier(slug: string): string {
  return (
    "resume" +
    slug.replace(/(?:^|-)([a-z0-9])/g, (_, char: string) => char.toUpperCase())
  );
}

/**
 * Minimal placeholder content. `schema.parse` proves the scaffold is
 * schema-valid at run time, so a schema change that invalidates this shape
 * fails here, loudly, instead of leaving `check` to find the broken file.
 * `createVariant` passes the target repo's schema; the default is this one's.
 */
export function scaffoldResume(
  slug: string,
  schema: typeof resumeSchema = resumeSchema,
): Resume {
  return schema.parse({
    header: {
      name: "Scaffold Name",
      subtitle: [`Placeholder content for the ${slug} variant`],
      contact: { email: "replace@example.com" },
    },
    sections: [
      {
        kind: "skills",
        label: "Skills",
        bullets: ["Replace this scaffold with real content"],
      },
    ],
  });
}

/** Thrown when an edited file no longer matches the shape the edit expects. */
export class DriftError extends Error {}

// The two anchors the registry edit relies on. If either is missing, the file
// has been restructured and a human (or a more careful agent) must register
// the variant by hand, as described under "Variant paths" in README.md.
const IMPORT_ANCHOR = /^import .+ from "@\/resumes\/.+\.(?:json|md)";$/m;
const ENTRY_ANCHOR = "} satisfies Record<string, ResumeVariant>;";

/**
 * Returns the registry source with the new variant's import and entry added.
 * The theme defaults to the template's id, since a template's tokens are
 * what its theme provides. Pure text transform; throws `DriftError` when an
 * anchor is missing and a plain `Error` when the slug is already registered.
 */
export function addVariantToRegistry(
  source: string,
  slug: string,
  templateId: string,
  format: ContentFormat = "json",
  themeId: string = templateId,
): string {
  if (new RegExp(`resumeFile: "resumes/${slug}\\.(?:json|md)"`).test(source)) {
    throw new Error(`"${slug}" is already registered in ${REGISTRY_FILE}.`);
  }

  // Insert the JSON import after the last existing one, keeping them grouped.
  const importMatches = [...source.matchAll(new RegExp(IMPORT_ANCHOR, "gm"))];
  const lastImport = importMatches.at(-1);
  if (!lastImport || lastImport.index === undefined) {
    throw new DriftError(
      `${REGISTRY_FILE} has no \`import ... from "@/resumes/*.json"\` (or \`*.md\`) line to anchor on. Register the variant by hand (see "Variants" in README.md).`,
    );
  }
  const identifier = slugToIdentifier(slug);
  const importEnd = lastImport.index + lastImport[0].length;
  let next =
    source.slice(0, importEnd) +
    `\nimport ${identifier} from "@/resumes/${slug}.${format}";` +
    source.slice(importEnd);

  // Insert the entry just above the closing `satisfies` line.
  const anchorIndex = next.indexOf(ENTRY_ANCHOR);
  if (anchorIndex === -1) {
    throw new DriftError(
      `${REGISTRY_FILE} has no \`${ENTRY_ANCHOR}\` line to anchor on. Register the variant by hand (see "Variants" in README.md).`,
    );
  }
  const key = SLUG_PATTERN.test(slug) && !slug.includes("-") ? slug : JSON.stringify(slug);
  const entry = [
    `  ${key}: {`,
    `    id: "${slug}",`,
    `    slug: "${slug}",`,
    `    pathname: "/${slug}",`,
    `    resumeFile: "resumes/${slug}.${format}",`,
    `    resume: ${identifier},`,
    `    templateId: "${templateId}",`,
    `    themeId: "${themeId}",`,
    `  },`,
    "",
  ].join("\n");
  next = next.slice(0, anchorIndex) + entry + next.slice(anchorIndex);

  return next;
}

/**
 * Returns .gitignore with an un-ignore line for the new file, added after the
 * existing `!resumes/*` lines so a registered variant stays tracked.
 * No-ops when the line already exists.
 */
export function addVariantToGitignore(
  source: string,
  slug: string,
  format: ContentFormat = "json",
): string {
  const line = `!resumes/${slug}.${format}`;
  if (source.split("\n").includes(line)) return source;
  const anchor = "!resumes/default.json";
  const anchorIndex = source.indexOf(anchor);
  if (anchorIndex === -1) {
    throw new DriftError(
      `${GITIGNORE_FILE} has no \`${anchor}\` line to anchor on. Add \`${line}\` by hand so the new variant stays tracked.`,
    );
  }
  const anchorEnd = anchorIndex + anchor.length;
  return source.slice(0, anchorEnd) + `\n${line}` + source.slice(anchorEnd);
}

export type CreateResult = {
  slug: string;
  file: string;
  registry: string;
  route: string;
  next: string;
};

/**
 * Orchestrates the three writes in the target repo, through that repo's own
 * template registry, schema, and markdown writer. Validates everything before
 * writing anything.
 */
export async function createVariant(
  slug: string,
  templateId: string,
  format: ContentFormat = "json",
  themeId: string = templateId,
): Promise<CreateResult> {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `"${slug}" is not a valid slug. Use lowercase letters, digits, and single hyphens, e.g. backend-staff.`,
    );
  }

  const { resumeTemplates } = await loadRepoModule<typeof import("@/templates")>(
    TEMPLATES_FILE,
  );
  if (!(templateId in resumeTemplates)) {
    throw new Error(
      `"${templateId}" is not a registered template. ${TEMPLATES_FILE} registers: ${Object.keys(resumeTemplates).join(", ")}.`,
    );
  }

  const resumeFile = `resumes/${slug}.${format}`;
  const resumePath = repoPath(resumeFile);
  if (existsSync(resumePath)) {
    throw new Error(
      `${resumeFile} already exists. Delete it first, or pick another slug.`,
    );
  }

  const registryPath = repoPath(REGISTRY_FILE);
  const gitignorePath = repoPath(GITIGNORE_FILE);
  const registry = addVariantToRegistry(
    readFileSync(registryPath, "utf8"),
    slug,
    templateId,
    format,
    themeId,
  );
  const gitignore = addVariantToGitignore(
    readFileSync(gitignorePath, "utf8"),
    slug,
    format,
  );
  const { resumeSchema: schema } = await loadRepoModule<typeof import("@/lib/schema")>(
    "lib/schema.ts",
  );
  const { resumeToMarkdown } = await loadRepoModule<
    typeof import("@/lib/resume-markdown")
  >("lib/resume-markdown.ts");
  const scaffold = scaffoldResume(slug, schema);
  const resume =
    format === "md"
      ? resumeToMarkdown(scaffold)
      : JSON.stringify(scaffold, null, 2) + "\n";

  writeFileSync(resumePath, resume);
  writeFileSync(registryPath, registry);
  writeFileSync(gitignorePath, gitignore);

  return {
    slug,
    file: resumeFile,
    registry: REGISTRY_FILE,
    route: `/${slug}`,
    next: `Replace the placeholder content in ${resumeFile} (see ${format === "md" ? "docs/markdown-dialect.md" : "docs/schema-contract.md"}), then run \`bun run check\`.`,
  };
}
