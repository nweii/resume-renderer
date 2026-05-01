// ABOUTME: Tests for the default schema-driven Markdown converter. Covers each
// section kind, header shape, inline-bold passthrough, and a smoke test on
// default.json so the live resume stays convertible as it evolves.

import { describe, expect, test } from "bun:test";
import master from "@/resumes/default.json";
import { resumeToMarkdown } from "@/lib/resume-markdown";
import { resumeSchema } from "@/lib/schema";

const minimalHeader = {
  name: "Test Person",
  subtitle: [] as string[],
  contact: { email: "test@example.com" },
};

function buildResume(overrides: Partial<ReturnType<typeof resumeSchema.parse>>) {
  return resumeSchema.parse({ header: minimalHeader, sections: [], ...overrides });
}

describe("resumeToMarkdown", () => {
  test("emits name as H1", () => {
    const md = resumeToMarkdown(buildResume({}));
    expect(md).toStartWith("# Test Person\n");
  });

  test("joins multi-line subtitle with a hard line break", () => {
    const md = resumeToMarkdown(
      buildResume({
        header: { ...minimalHeader, subtitle: ["Line A", "Line B"] },
      }),
    );
    expect(md).toContain("Line A  \nLine B");
  });

  test("renders email as an autolink and links joined with separators", () => {
    const md = resumeToMarkdown(
      buildResume({
        header: {
          ...minimalHeader,
          contact: {
            email: "e@x.com",
            links: [
              { url: "https://nathancheng.work", label: "nathancheng.work" },
              { url: "https://github.com/nweii", label: "github.com/nweii" },
            ],
          },
        },
      }),
    );
    expect(md).toContain("<e@x.com>");
    expect(md).toContain("[nathancheng.work](https://nathancheng.work)");
    expect(md).toContain(
      "<e@x.com> · [nathancheng.work](https://nathancheng.work) · [github.com/nweii](https://github.com/nweii)",
    );
  });

  test("renders a skills section as H2 plus bulleted list", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [{ kind: "skills", label: "Skills", bullets: ["Go", "TypeScript"] }],
      }),
    );
    expect(md).toContain("## Skills");
    expect(md).toContain("- Go");
    expect(md).toContain("- TypeScript");
  });

  test("renders a project entry with date range and bullets", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "projects",
            label: "Projects",
            entries: [{ title: "Widget", dateRange: "2024", bullets: ["Built it"] }],
          },
        ],
      }),
    );
    expect(md).toContain("### Widget — 2024");
    expect(md).toContain("- Built it");
  });

  test("omits the date-range separator when a project has no dateRange", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "projects",
            label: "Projects",
            entries: [{ title: "Dateless", bullets: ["Still shipped"] }],
          },
        ],
      }),
    );
    expect(md).toContain("### Dateless\n");
    expect(md).not.toContain("Dateless —");
  });

  test("experience uses 'at' when organization is present", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "experiences",
            label: "Experience",
            entries: [
              {
                title: "Software Engineer",
                organization: "Acme",
                dateRange: "2020–2024",
                bullets: ["Did work"],
              },
            ],
          },
        ],
      }),
    );
    expect(md).toContain("### Software Engineer at Acme — 2020–2024");
  });

  test("experience omits 'at' when organization is absent", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "experiences",
            label: "Experience",
            entries: [{ title: "VfA Fellowship", bullets: ["Did work"] }],
          },
        ],
      }),
    );
    expect(md).toContain("### VfA Fellowship\n");
    expect(md).not.toContain("at undefined");
  });

  test("experience summary renders before bullets when both are present", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "experiences",
            label: "Experience",
            entries: [
              {
                title: "T",
                summary: "Summary paragraph.",
                bullets: ["Bullet one"],
              },
            ],
          },
        ],
      }),
    );
    const summaryIdx = md.indexOf("Summary paragraph.");
    const bulletIdx = md.indexOf("- Bullet one");
    expect(summaryIdx).toBeGreaterThanOrEqual(0);
    expect(bulletIdx).toBeGreaterThan(summaryIdx);
  });

  test("education entry without bullets renders as head only", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "education",
            label: "Education",
            entries: [{ title: "The Odin Project", dateRange: "2022" }],
          },
        ],
      }),
    );
    expect(md).toContain("### The Odin Project — 2022");
    // No stray empty bullet list below the head.
    expect(md).not.toMatch(/The Odin Project — 2022\n\n-/);
  });

  test("preserves **bold** markers verbatim (inline bold is already Markdown)", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          { kind: "skills", label: "Skills", bullets: ["**Built** a thing"] },
        ],
      }),
    );
    expect(md).toContain("- **Built** a thing");
  });

  test("blocks are separated by a single blank line", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          { kind: "skills", label: "Skills", bullets: ["A", "B"] },
          {
            kind: "projects",
            label: "Projects",
            entries: [{ title: "P", bullets: ["x"] }],
          },
        ],
      }),
    );
    // Triple-newline would indicate an extra blank line between blocks.
    expect(md).not.toMatch(/\n\n\n/);
  });

  test("round-trips default.json into a non-empty doc starting with the name", () => {
    const resume = resumeSchema.parse(master);
    const md = resumeToMarkdown(resume);
    expect(md.length).toBeGreaterThan(200);
    expect(md).toStartWith(`# ${resume.header.name}\n`);
    // Every section label should appear as an H2.
    for (const section of resume.sections) {
      expect(md).toContain(`## ${section.label}`);
    }
  });
});
