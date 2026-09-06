// Turns a registered variant's content file into validated content, or into
// issues stated in that file's own terms: a JSON path for a `.json` file, a
// line and heading for a `.md` one. The page, the data endpoints, and `check`
// all read content through here, so every surface reports the same problems.

import { parseResumeMarkdown } from "@/lib/resume-markdown";
import type { ResumeVariant } from "@/lib/resume-variants";
import { resumeSchema, type Resume } from "@/lib/schema";

export type ContentIssue = {
  /** Where in the file: `sections.2.entries.0.bullets.1`, or `line 14 (## Experience)`. */
  at: string;
  message: string;
};

export type ContentResult =
  | { resume: Resume; issues: [] }
  | { resume: undefined; issues: ContentIssue[] };

export function isMarkdownVariant(variant: Pick<ResumeVariant, "resumeFile">): boolean {
  return variant.resumeFile.endsWith(".md");
}

export function readResume(variant: Pick<ResumeVariant, "resumeFile" | "resume">): ContentResult {
  let source = variant.resume;
  if (isMarkdownVariant(variant)) {
    const parsed = parseResumeMarkdown(String(variant.resume));
    if (parsed.issues.length > 0) {
      return {
        resume: undefined,
        issues: parsed.issues.map((issue) => ({
          at: issue.heading ? `line ${issue.line} (${issue.heading})` : `line ${issue.line}`,
          message: issue.message,
        })),
      };
    }
    source = parsed.resume;
  }

  const result = resumeSchema.safeParse(source);
  if (result.success) return { resume: result.data, issues: [] };
  return {
    resume: undefined,
    issues: result.error.issues.map((issue) => ({
      at: issue.path.length > 0 ? issue.path.join(".") : "(root)",
      // Zod's message for a failed union is bare "Invalid input"; its `note`
      // is the part that says which way the input was wrong.
      message: hasNote(issue) ? `${issue.message} (${issue.note})` : issue.message,
    })),
  };
}

/** Validated content, or a thrown error listing every issue. For the build-time data endpoints. */
export function requireResume(variant: Pick<ResumeVariant, "resumeFile" | "resume">): Resume {
  const result = readResume(variant);
  if (result.resume) return result.resume;
  throw new Error(
    [`${variant.resumeFile} failed validation:`, ...result.issues.map((issue) => `  ${issue.at} — ${issue.message}`)].join("\n"),
  );
}

function hasNote(issue: unknown): issue is { note: string } {
  return typeof (issue as { note?: unknown }).note === "string";
}
