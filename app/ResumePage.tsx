import type { ResumeVariant } from "@/lib/resume-variants";
import { resumeSchema } from "@/lib/schema";
import { getResumeTemplate } from "@/templates";
import { AgentEndpoints } from "./AgentEndpoints";
import { PageEdge } from "./PageEdge";
import { ResumeScaler } from "./ResumeScaler";

export function ResumePage({ variant }: { variant: ResumeVariant }) {
  const parsed = resumeSchema.safeParse(variant.resume);
  if (!parsed.success) {
    // Fail loud and readable. This is the error path the agent loop sees
    // when JSON drifts from the schema — surface the raw issues array so edits
    // can be fixed without round-tripping through the console.
    return (
      <main className="min-h-screen bg-red-50 p-8 font-mono text-sm text-red-900 dark:bg-red-950/50 dark:text-red-100">
        <h1 className="mb-4 text-lg font-bold">{variant.resumeFile} failed schema validation</h1>
        <pre className="whitespace-pre-wrap">{JSON.stringify(parsed.error.issues, null, 2)}</pre>
      </main>
    );
  }

  const { shell, Document } = getResumeTemplate(variant.templateId);
  const { header, sections } = parsed.data;

  return (
    <main
      data-resume-theme={variant.themeId}
      data-resume-variant={variant.id}
      className={shell.mainClassName}>
      <ResumeScaler />
      <article className={shell.articleClassName}>
        {/*
          Dev-only overflow warning. The template targets a single 8.5×11
          sheet; when content spills past 11in, PageEdge renders a red dashed
          rule at the boundary with the overflow magnitude. Stripped in
          production so the deployed page stays clean. Manual eyeballing /
          Chrome print preview remain the check in prod; a shared fit signal
          for `bun test` is deferred until pretext ships server-side.
        */}
        {process.env.NODE_ENV === "development" && <PageEdge />}
        <Document resume={{ header, sections }} />
      </article>
      <AgentEndpoints variant={variant} />
    </main>
  );
}
