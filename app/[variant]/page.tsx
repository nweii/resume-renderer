import { notFound } from "next/navigation";
import { getResumeVariantBySlug, listStaticResumeVariantSlugs } from "@/lib/resume-variants";
import { ResumePage } from "../ResumePage";

export function generateStaticParams() {
  return listStaticResumeVariantSlugs();
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
