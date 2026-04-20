import type { ComponentType } from "react";
import type { Resume } from "@/lib/schema";
import { CurrentResumeDocument } from "./current/sections";
import { currentTemplateShell } from "./current/shell";

export type ResumeTemplateDefinition = {
  id: string;
  shell: {
    readonly mainClassName: string;
    readonly articleClassName: string;
  };
  Document: ComponentType<{ resume: Resume }>;
};

export const resumeTemplates = {
  current: {
    id: "current",
    shell: currentTemplateShell,
    Document: CurrentResumeDocument,
  },
} satisfies Record<string, ResumeTemplateDefinition>;

export type ResumeTemplateId = keyof typeof resumeTemplates;

/**
 * Code-selected active template. Add a new entry to `resumeTemplates`, then
 * point this constant at its key to render that template on `/`.
 */
export const activeResumeTemplateId: ResumeTemplateId = "current";

export function getActiveResumeTemplate(): (typeof resumeTemplates)[ResumeTemplateId] {
  return resumeTemplates[activeResumeTemplateId];
}
