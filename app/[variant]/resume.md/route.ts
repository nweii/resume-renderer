// ABOUTME: GET /<variant>/resume.md — a named variant as Markdown. Resolves
// the variant via the registry, then defers to the shared
// resumeMarkdownResponse helper which honors the template's optional override.

import { notFound } from "next/navigation";
import { getResumeVariantBySlug, listStaticResumeVariantSlugs } from "@/lib/resume-variants";
import { resumeMarkdownResponse } from "@/lib/resume-responses";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listStaticResumeVariantSlugs();
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant: slug } = await params;
  const variant = getResumeVariantBySlug(slug);
  if (!variant) notFound();
  return resumeMarkdownResponse(variant);
}
