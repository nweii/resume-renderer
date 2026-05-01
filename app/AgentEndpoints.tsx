// ABOUTME: Footer affordance under the rendered resume that exposes the
// machine-readable representations (JSON, Markdown) and a one-click route to
// the browser print dialog (PDF). Screen-only; hidden in print.

"use client";

import type { ResumeVariant } from "@/lib/resume-variants";

/**
 * Endpoint paths for the JSON + Markdown siblings of a variant's HTML page.
 * Default variant lives at the site root (`/resume.json`); slugged variants
 * live under their slug (`/<slug>/resume.json`).
 */
function dataEndpoints(variant: ResumeVariant) {
  const prefix = variant.id === "default" ? "" : `/${variant.slug}`;
  return { json: `${prefix}/resume.json`, markdown: `${prefix}/resume.md` };
}

export function AgentEndpoints({ variant }: { variant: ResumeVariant }) {
  const { json, markdown } = dataEndpoints(variant);
  const linkCls = "underline underline-offset-2";
  return (
    <footer className="text-(--t-playroom-heading-ink)/70 mt-4 text-center text-[8.5pt] print:hidden">
      <a className={linkCls} href={json}>
        JSON
      </a>{" "}
      ·{" "}
      <a className={linkCls} href={markdown}>
        Markdown
      </a>{" "}
      ·{" "}
      <button
        type="button"
        className={`${linkCls} cursor-pointer bg-transparent`}
        onClick={() => window.print()}>
        PDF
      </button>
    </footer>
  );
}
