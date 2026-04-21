import type { ComponentType } from "react";
import type { Resume } from "@/lib/schema";
import * as current from "./current";

export type ResumeTemplate = {
  id: string;
  shell: { readonly mainClassName: string; readonly articleClassName: string };
  Document: ComponentType<{ resume: Resume }>;
};

export const resumeTemplates = {
  current: { id: "current", shell: current.shell, Document: current.Document },
} satisfies Record<string, ResumeTemplate>;

export type ResumeTemplateId = keyof typeof resumeTemplates;

export function getResumeTemplate(templateId: ResumeTemplateId): ResumeTemplate {
  return resumeTemplates[templateId];
}
