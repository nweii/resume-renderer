import type { ComponentType } from "react";
import type { Resume } from "@/lib/schema";
import * as current from "./current";

/**
 * A template owns one resume presentation. HTML is required (`Document`).
 * Markdown is optional — the `.md` data endpoint falls back to the shared
 * schema-driven converter in `lib/resume-markdown.ts` when absent, so a new
 * template only implements `toMarkdown` if it genuinely diverges from the
 * default outline (e.g., reorders sections, collapses two section kinds into
 * one, or adds a template-specific flourish worth preserving in Markdown).
 */
export type ResumeTemplate = {
  id: string;
  shell: { readonly mainClassName: string; readonly articleClassName: string };
  Document: ComponentType<{ resume: Resume }>;
  toMarkdown?: (resume: Resume) => string;
};

export const resumeTemplates = {
  current: { id: "current", shell: current.shell, Document: current.Document },
} satisfies Record<string, ResumeTemplate>;

export type ResumeTemplateId = keyof typeof resumeTemplates;

export function getResumeTemplate(templateId: ResumeTemplateId): ResumeTemplate {
  return resumeTemplates[templateId];
}
