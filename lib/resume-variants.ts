import defaultResume from "@/resumes/default.json";
import type { ResumeTemplateId } from "@/templates";

export type ResumeThemeId = "playroom";

export type ResumeVariant = {
  id: string;
  slug: string;
  pathname: `/${string}`;
  resumeFile: string;
  resume: unknown;
  templateId: ResumeTemplateId;
  themeId: ResumeThemeId;
};

export const resumeVariants = {
  default: {
    id: "default",
    slug: "default",
    pathname: "/default",
    resumeFile: "resumes/default.json",
    resume: defaultResume,
    templateId: "playroom",
    themeId: "playroom",
  },
} satisfies Record<string, ResumeVariant>;

export type ResumeVariantId = keyof typeof resumeVariants;

export const defaultResumeVariantId: ResumeVariantId = "default";

export function getDefaultResumeVariant(): ResumeVariant {
  const variant = resumeVariants[defaultResumeVariantId];
  return { ...variant, pathname: "/" };
}

export function getResumeVariantBySlug(slug: string): ResumeVariant | undefined {
  return resumeVariants[slug as ResumeVariantId];
}

export function getResumeVariantByPath(pathname: string): ResumeVariant | undefined {
  if (pathname === "/" || pathname === "") {
    return getDefaultResumeVariant();
  }

  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return getResumeVariantBySlug(normalizedPathname.slice(1));
}

export function listStaticResumeVariantSlugs() {
  return Object.values(resumeVariants).map((variant) => ({ variant: variant.slug }));
}
