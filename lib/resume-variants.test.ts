import { describe, expect, test } from "bun:test";
import {
  getResumeVariantBySlug,
  getResumeVariantByPath,
  listStaticResumeVariantSlugs,
} from "@/lib/resume-variants";

describe("resume variant registry", () => {
  test("resolves the canonical root route", () => {
    const variant = getResumeVariantByPath("/");

    expect(variant.id).toBe("default");
    expect(variant.pathname).toBe("/");
    expect(variant.templateId).toBe("current");
    expect(variant.themeId).toBe("current");
  });

  test("resolves a configured slug route", () => {
    const variant = getResumeVariantBySlug("default");

    expect(variant?.id).toBe("default");
    expect(variant?.pathname).toBe("/default");
  });

  test("lists only non-root static slugs for export", () => {
    expect(listStaticResumeVariantSlugs()).toEqual([{ variant: "default" }]);
  });

  test("returns nothing for an unknown slug", () => {
    expect(getResumeVariantBySlug("does-not-exist")).toBeUndefined();
  });
});
