// ABOUTME: GET /<variant>/resume.json — a named variant as validated JSON.
// Slugs are enumerated from the variant registry at build time via
// generateStaticParams so every registered variant gets a static file.

import { notFound } from "next/navigation";
import { getResumeVariantBySlug, listStaticResumeVariantSlugs } from "@/lib/resume-variants";
import { resumeJsonResponse } from "@/lib/resume-responses";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listStaticResumeVariantSlugs();
}

export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant: slug } = await params;
  const variant = getResumeVariantBySlug(slug);
  if (!variant) notFound();
  return resumeJsonResponse(variant);
}
