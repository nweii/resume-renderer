// ABOUTME: Shared helpers that turn a resume variant into validated JSON or
// Markdown Responses. Centralizes the content read + template-override +
// content-type wiring so the four .json/.md route handlers stay one-liners.

import { requireResume } from "@/lib/resume-content";
import type { ResumeVariant } from "@/lib/resume-variants";
import { resumeToMarkdown } from "@/lib/resume-markdown";
import { siteConfig } from "@/lib/site";
import { getResumeTemplate } from "@/templates";

// Mirrors `public/_headers` for parity in dev — production reads those static
// rules instead, since Next's static export drops Response headers when it
// writes the body to disk.
function dispositionFor(extension: "json" | "md"): string {
  return `inline; filename="${siteConfig.name} - Resume.${extension}"`;
}

export function resumeJsonResponse(variant: ResumeVariant): Response {
  // `requireResume` throws, which fails loudly at build time for the static
  // export, so invalid content never lands in production as a served file.
  // The HTML route keeps its own non-throwing read for the faster dev loop.
  const resume = requireResume(variant);
  return new Response(JSON.stringify(resume, null, 2) + "\n", {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": dispositionFor("json"),
    },
  });
}

export function resumeMarkdownResponse(variant: ResumeVariant): Response {
  const resume = requireResume(variant);
  const template = getResumeTemplate(variant.templateId);
  const markdown = template.toMarkdown?.(resume) ?? resumeToMarkdown(resume);
  return new Response(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": dispositionFor("md"),
    },
  });
}
