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
    expect(variant.templateId).toBe("playroom");
    expect(variant.themeId).toBe("playroom");
  });

  test("resolves a configured slug route", () => {
    const variant = getResumeVariantBySlug("default");

    expect(variant?.id).toBe("default");
    expect(variant?.pathname).toBe("/default");
  });

  test("lists static slugs for export, including the canonical default", () => {
    // Local tailored variants (gitignored) extend the registry, so assert on
    // shape and the always-present default rather than the exact list.
    const slugs = listStaticResumeVariantSlugs();

    expect(slugs).toContainEqual({ variant: "default" });
    for (const entry of slugs) {
      expect(Object.keys(entry)).toEqual(["variant"]);
    }
  });

  test("returns nothing for an unknown slug", () => {
    expect(getResumeVariantBySlug("does-not-exist")).toBeUndefined();
  });
});
