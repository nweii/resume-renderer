import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResumeVariantBySlug, listStaticResumeVariantSlugs } from "@/lib/resume-variants";
import { ResumePage } from "../ResumePage";

export function generateStaticParams() {
  return listStaticResumeVariantSlugs();
}

// Advertise the JSON + Markdown siblings so AI agents and crawlers can find
// the machine-readable representations without scraping the rendered HTML.
export async function generateMetadata({ params }: { params: Promise<{ variant: string }> }): Promise<Metadata> {
  const { variant: slug } = await params;
  return {
    alternates: {
      types: {
        "application/json": `/${slug}/resume.json`,
        "text/markdown": `/${slug}/resume.md`,
      },
    },
  };
}

export default async function VariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant: slug } = await params;
  const variant = getResumeVariantBySlug(slug);

  if (!variant) {
    notFound();
  }

  return <ResumePage variant={variant} />;
}
