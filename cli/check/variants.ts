// Validates the content of every registered variant. Knows that variants have
// a declared shape, never what the shape means. Problems are reported in the
// content file's own terms: a JSON path for `.json`, a line and heading for `.md`.

import { readResume, type ContentIssue } from "@/lib/resume-content";
import { resumeVariants, type ResumeVariant } from "@/lib/resume-variants";

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

/** Defaults to the registry; takes an explicit list so tests can pass bad content. */
export function checkVariants(
  variants: readonly ResumeVariant[] = Object.values(resumeVariants),
): VariantReport {
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
