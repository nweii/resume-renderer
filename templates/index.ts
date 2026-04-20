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

/**
 * Code-selected active template. To try a different template, add a folder
 * under `templates/` exporting `shell` and `Document`, register it above,
 * then point this constant at its key.
 */
export const activeResumeTemplateId: ResumeTemplateId = "current";

export function getActiveResumeTemplate(): ResumeTemplate {
  return resumeTemplates[activeResumeTemplateId];
}
