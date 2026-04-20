import master from "@/resumes/master.json";
import { resumeSchema } from "@/lib/schema";
import { getActiveResumeTemplate } from "@/templates";
import { PageEdge } from "./PageEdge";
import { ResumeScaler } from "./ResumeScaler";

export default function Home() {
  const parsed = resumeSchema.safeParse(master);
  if (!parsed.success) {
    // Fail loud and readable. This is the error path the agent loop sees
    // when JSON drifts from the schema — surface z.prettifyError so edits
    // can be fixed without round-tripping through the console.
    return (
      <main className="min-h-screen bg-red-50 p-8 font-mono text-sm text-red-900 dark:bg-red-950/50 dark:text-red-100">
        <h1 className="mb-4 text-lg font-bold">resumes/master.json failed schema validation</h1>
        <pre className="whitespace-pre-wrap">{JSON.stringify(parsed.error.issues, null, 2)}</pre>
      </main>
    );
  }

  const { shell, Document } = getActiveResumeTemplate();
  const { header, sections } = parsed.data;

  return (
    <main className={shell.mainClassName}>
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
    </main>
  );
}
