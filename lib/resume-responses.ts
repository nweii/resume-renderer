// ABOUTME: Shared helpers that turn a resume variant into validated JSON or
// Markdown Responses. Centralizes the schema.parse + template-override +
// content-type wiring so the four .json/.md route handlers stay one-liners.

import type { ResumeVariant } from "@/lib/resume-variants";
import { resumeToMarkdown } from "@/lib/resume-markdown";
import { resumeSchema } from "@/lib/schema";
import { getResumeTemplate } from "@/templates";

export function resumeJsonResponse(variant: ResumeVariant): Response {
  // `parse` (not safeParse) fails loudly at build time for the static export,
  // so invalid resume JSON never lands in production as a served file. The
  // HTML route keeps its own safeParse flow for the faster dev edit loop.
  const resume = resumeSchema.parse(variant.resume);
  return new Response(JSON.stringify(resume, null, 2) + "\n", {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function resumeMarkdownResponse(variant: ResumeVariant): Response {
  const resume = resumeSchema.parse(variant.resume);
  const template = getResumeTemplate(variant.templateId);
  const markdown = template.toMarkdown?.(resume) ?? resumeToMarkdown(resume);
  return new Response(markdown, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
