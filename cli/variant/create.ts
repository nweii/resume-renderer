// Scaffolds a new variant: a schema-valid content file, a registry entry in
// lib/resume-variants.ts, the .gitignore un-ignore line that keeps the file
// tracked, and therefore a rendering route. The registry and .gitignore edits
// are anchor-based and refuse to run when either file has drifted from the
// shape they expect.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { resumeSchema, type Resume } from "@/lib/schema";
import type { ResumeTemplateId } from "@/templates";

export const REGISTRY_FILE = "lib/resume-variants.ts";
export const GITIGNORE_FILE = ".gitignore";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;

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
 * Minimal placeholder content. `resumeSchema.parse` proves the scaffold is
 * schema-valid at run time, so a schema change that invalidates this shape
 * fails here, loudly, instead of leaving `check` to find the broken file.
 */
export function scaffoldResume(slug: string): Resume {
  return resumeSchema.parse({
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
const IMPORT_ANCHOR = /^import .+ from "@\/resumes\/.+\.json";$/m;
const ENTRY_ANCHOR = "} satisfies Record<string, ResumeVariant>;";

/**
 * Returns the registry source with the new variant's import and entry added.
 * Pure text transform; throws `DriftError` when an anchor is missing and a
 * plain `Error` when the slug is already registered.
 */
export function addVariantToRegistry(
  source: string,
  slug: string,
  templateId: ResumeTemplateId,
): string {
  if (source.includes(`resumeFile: "resumes/${slug}.json"`)) {
    throw new Error(`"${slug}" is already registered in ${REGISTRY_FILE}.`);
  }

  // Insert the JSON import after the last existing one, keeping them grouped.
  const importMatches = [...source.matchAll(new RegExp(IMPORT_ANCHOR, "gm"))];
  const lastImport = importMatches.at(-1);
  if (!lastImport || lastImport.index === undefined) {
    throw new DriftError(
      `${REGISTRY_FILE} has no \`import ... from "@/resumes/*.json"\` line to anchor on. Register the variant by hand (see "Variant paths" in README.md).`,
    );
  }
  const identifier = slugToIdentifier(slug);
  const importEnd = lastImport.index + lastImport[0].length;
  let next =
    source.slice(0, importEnd) +
    `\nimport ${identifier} from "@/resumes/${slug}.json";` +
    source.slice(importEnd);

  // Insert the entry just above the closing `satisfies` line.
  const anchorIndex = next.indexOf(ENTRY_ANCHOR);
  if (anchorIndex === -1) {
    throw new DriftError(
      `${REGISTRY_FILE} has no \`${ENTRY_ANCHOR}\` line to anchor on. Register the variant by hand (see "Variant paths" in README.md).`,
    );
  }
  const key = SLUG_PATTERN.test(slug) && !slug.includes("-") ? slug : JSON.stringify(slug);
  const entry = [
    `  ${key}: {`,
    `    id: "${slug}",`,
    `    slug: "${slug}",`,
    `    pathname: "/${slug}",`,
    `    resumeFile: "resumes/${slug}.json",`,
    `    resume: ${identifier},`,
    `    templateId: "${templateId}",`,
    `    themeId: "baseline",`,
    `  },`,
    "",
  ].join("\n");
  next = next.slice(0, anchorIndex) + entry + next.slice(anchorIndex);

  return next;
}

/**
 * Returns .gitignore with an un-ignore line for the new file, added after the
 * existing `!resumes/*.json` lines so a registered variant stays tracked.
 * No-ops when the line already exists.
 */
export function addVariantToGitignore(source: string, slug: string): string {
  const line = `!resumes/${slug}.json`;
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

/** Orchestrates the three writes. Validates everything before writing anything. */
export function createVariant(
  slug: string,
  templateId: ResumeTemplateId,
): CreateResult {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `"${slug}" is not a valid slug. Use lowercase letters, digits, and single hyphens, e.g. backend-staff.`,
    );
  }

  const resumeFile = `resumes/${slug}.json`;
  const resumePath = join(REPO_ROOT, resumeFile);
  if (existsSync(resumePath)) {
    throw new Error(
      `${resumeFile} already exists. Delete it first, or pick another slug.`,
    );
  }

  const registryPath = join(REPO_ROOT, REGISTRY_FILE);
  const gitignorePath = join(REPO_ROOT, GITIGNORE_FILE);
  const registry = addVariantToRegistry(
    readFileSync(registryPath, "utf8"),
    slug,
    templateId,
  );
  const gitignore = addVariantToGitignore(
    readFileSync(gitignorePath, "utf8"),
    slug,
  );
  const resume = JSON.stringify(scaffoldResume(slug), null, 2) + "\n";

  writeFileSync(resumePath, resume);
  writeFileSync(registryPath, registry);
  writeFileSync(gitignorePath, gitignore);

  return {
    slug,
    file: resumeFile,
    registry: REGISTRY_FILE,
    route: `/${slug}`,
    next: `Replace the placeholder content in ${resumeFile} (see docs/schema-contract.md), then run \`bun run check\`.`,
  };
}
