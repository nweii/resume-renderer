// ABOUTME: GET /resume.md — the default variant as Markdown. Uses the active
// template's `toMarkdown` override if present, otherwise the shared
// schema-driven default in `lib/resume-markdown.ts`.

import { getDefaultResumeVariant } from "@/lib/resume-variants";
import { resumeMarkdownResponse } from "@/lib/resume-responses";

export const dynamic = "force-static";

export function GET() {
  return resumeMarkdownResponse(getDefaultResumeVariant());
}
