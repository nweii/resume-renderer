// Validates the canonical content of every registered variant against the
// schema. Knows that variants have a declared shape, never what the shape means.

import { resumeVariants, type ResumeVariant } from "@/lib/resume-variants";
import { resumeSchema } from "@/lib/schema";

export type VariantIssue = {
  /** Dotted path into the JSON, e.g. `sections.2.entries.0.bullets.1`. */
  path: string;
  message: string;
};

export type VariantFailure = {
  id: string;
  file: string;
  issues: VariantIssue[];
};

export type VariantReport = {
  checked: string[];
  failures: VariantFailure[];
};

function hasNote(issue: unknown): issue is { note: string } {
  return typeof (issue as { note?: unknown }).note === "string";
}

/** Defaults to the registry; takes an explicit list so tests can pass bad content. */
export function checkVariants(
  variants: readonly ResumeVariant[] = Object.values(resumeVariants),
): VariantReport {
  const failures: VariantFailure[] = [];

  for (const variant of variants) {
    const result = resumeSchema.safeParse(variant.resume);
    if (result.success) continue;

    failures.push({
      id: variant.id,
      file: variant.resumeFile,
      issues: result.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
        // Zod's message for a failed union is bare "Invalid input"; its `note`
        // is the part that says which way the input was wrong.
        message: hasNote(issue)
          ? `${issue.message} (${issue.note})`
          : issue.message,
      })),
    });
  }

  return { checked: variants.map((variant) => variant.id), failures };
}

/** One line per problem, addressed to whoever has to fix the JSON. */
export function describeVariantFailures(report: VariantReport): string[] {
  return report.failures.flatMap((failure) =>
    failure.issues.map(
      (issue) => `${failure.file}: ${issue.path} — ${issue.message}`,
    ),
  );
}
