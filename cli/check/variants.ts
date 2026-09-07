// Validates the content of every registered variant. Knows that variants have
// a declared shape, never what the shape means. Problems are reported in the
// content file's own terms: a JSON path for `.json`, a line and heading for `.md`.

import { readFileSync } from "node:fs";

import type { ContentIssue } from "@/lib/resume-content";
import type { ResumeVariant } from "@/lib/resume-variants";

import { loadRepoModule, repoPath } from "../repo";

export type VariantIssue = ContentIssue;

export type VariantFailure = {
  id: string;
  file: string;
  issues: VariantIssue[];
};

export type VariantReport = {
  checked: string[];
  failures: VariantFailure[];
};

/**
 * Defaults to the target repo's registry, read through that repo's own
 * content reader; takes an explicit list so tests can pass bad content.
 */
export async function checkVariants(
  variants?: readonly ResumeVariant[],
): Promise<VariantReport> {
  const { isMarkdownVariant, readResume } = await loadRepoModule<
    typeof import("@/lib/resume-content")
  >("lib/resume-content.ts");
  if (!variants) {
    const registry = await loadRepoModule<typeof import("@/lib/resume-variants")>(
      "lib/resume-variants.ts",
    );
    // A markdown import is its text only under the `[loader]` table in
    // bunfig.toml, which Bun reads from the working directory, so from a
    // subdirectory the registry would hold rendered HTML. The file on disk
    // is what the build imports; check reads that.
    variants = Object.values(registry.resumeVariants).map((variant) =>
      isMarkdownVariant(variant)
        ? { ...variant, resume: readFileSync(repoPath(variant.resumeFile), "utf8") }
        : variant,
    );
  }
  const failures: VariantFailure[] = [];

  for (const variant of variants) {
    const result = readResume(variant);
    if (result.resume) continue;
    failures.push({ id: variant.id, file: variant.resumeFile, issues: result.issues });
  }

  return { checked: variants.map((variant) => variant.id), failures };
}

/** One line per problem, addressed to whoever has to fix the file. */
export function describeVariantFailures(report: VariantReport): string[] {
  return report.failures.flatMap((failure) =>
    failure.issues.map(
      (issue) => `${failure.file}: ${issue.at} — ${issue.message}`,
    ),
  );
}
