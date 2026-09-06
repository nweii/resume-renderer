// ABOUTME: Tests for the markdown dialect in both directions: what
// `resumeToMarkdown` writes for each construct, that `parseResumeMarkdown`
// reads it back to the same content (the round-trip identity on the demo
// content), and that parse errors name a line and a heading.

import { describe, expect, test } from "bun:test";
import dialect from "@/docs/markdown-dialect.md";
import master from "@/resumes/default.json";
import {
  parseResumeMarkdown,
  resolveSectionKind,
  resumeToMarkdown,
} from "@/lib/resume-markdown";
import { resumeSchema } from "@/lib/schema";

const minimalHeader = {
  name: "Test Person",
  subtitle: [] as string[],
  contact: { email: "test@example.com" },
};

const frontmatter = [
  "---",
  "name: Test Person",
  "subtitle:",
  "contact:",
  "  email: test@example.com",
  "---",
].join("\n");

function buildResume(overrides: Partial<ReturnType<typeof resumeSchema.parse>>) {
  return resumeSchema.parse({ header: minimalHeader, sections: [], ...overrides });
}

/** Parses, asserting the dialect raised no issue, and returns the content. */
function parseClean(markdown: string) {
  const parsed = parseResumeMarkdown(markdown);
  expect(parsed.issues).toEqual([]);
  return parsed.resume;
}

describe("resumeToMarkdown", () => {
  test("opens with the header as frontmatter, then the name as H1", () => {
    const md = resumeToMarkdown(buildResume({}));
    expect(md).toStartWith(`${frontmatter}\n\n# Test Person\n`);
  });

  test("writes a multi-line subtitle as a list", () => {
    const md = resumeToMarkdown(
      buildResume({
        header: { ...minimalHeader, subtitle: ["Line A", "Line B"] },
      }),
    );
    expect(md).toContain("subtitle:\n  - Line A\n  - Line B\n");
  });

  test("writes contact links as a list of label and url", () => {
    const md = resumeToMarkdown(
      buildResume({
        header: {
          ...minimalHeader,
          contact: {
            email: "e@x.com",
            links: [
              { url: "https://example.com", label: "example.com" },
              { url: "https://github.com/example", label: "github.com/example" },
            ],
          },
        },
      }),
    );
    expect(md).toContain(
      "contact:\n  email: e@x.com\n  links:\n    - url: https://example.com\n      label: example.com\n    - url: https://github.com/example\n      label: github.com/example\n",
    );
  });

  test("renders a skills section as H2 plus bulleted list", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [{ kind: "skills", label: "Skills", bullets: ["Go", "TypeScript"] }],
      }),
    );
    expect(md).toContain("## Skills\n\n- Go\n- TypeScript\n");
  });

  test("renders a project entry with a date line and bullets", () => {
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
    expect(md).toContain("### Widget\n*2024*\n\n- Built it");
  });

  test("omits the date line when a project has no dateRange", () => {
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
    expect(md).toContain("### Dateless\n\n- Still shipped");
  });

  test("experience puts organization and date on one line under the title", () => {
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
    expect(md).toContain("### Software Engineer\n**Acme** · *2020–2024*\n\n- Did work");
  });

  test("experience keeps a title with its own 'at' phrasing intact when organization is absent", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "experiences",
            label: "Experience",
            entries: [{ title: "Fellow at VfA", bullets: ["Did work"] }],
          },
        ],
      }),
    );
    expect(md).toContain("### Fellow at VfA\n\n- Did work");
  });

  test("experience summary renders between the title and the bullets", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          {
            kind: "experiences",
            label: "Experience",
            entries: [{ title: "T", summary: "Summary paragraph.", bullets: ["Bullet one"] }],
          },
        ],
      }),
    );
    expect(md).toContain("### T\n\nSummary paragraph.\n\n- Bullet one");
  });

  test("education entry without bullets renders as head and date only", () => {
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
    expect(md).toContain("### The Odin Project\n*2022*\n");
    expect(md).not.toMatch(/\*2022\*\n\n-/);
  });

  test("marks the kind under a label that does not name it", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [{ kind: "projects", label: "Community", entries: [] }],
      }),
    );
    expect(md).toContain("## Community\n<!-- kind: projects -->\n");
  });

  test("preserves **bold** markers verbatim (inline bold is already Markdown)", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [{ kind: "skills", label: "Skills", bullets: ["**Built** a thing"] }],
      }),
    );
    expect(md).toContain("- **Built** a thing");
  });

  test("blocks are separated by a single blank line", () => {
    const md = resumeToMarkdown(
      buildResume({
        sections: [
          { kind: "skills", label: "Skills", bullets: ["A", "B"] },
          { kind: "projects", label: "Projects", entries: [{ title: "P", bullets: ["x"] }] },
        ],
      }),
    );
    expect(md).not.toMatch(/\n\n\n/);
  });
});

describe("resolveSectionKind", () => {
  test("matches labels case-insensitively and ignores trailing punctuation", () => {
    expect(resolveSectionKind("Work Experience:")).toBe("experiences");
    expect(resolveSectionKind("Selected project")).toBe("projects");
    expect(resolveSectionKind("SKILLS")).toBe("skills");
  });

  test("returns nothing for a label outside the table", () => {
    expect(resolveSectionKind("Community")).toBeUndefined();
  });
});

describe("parseResumeMarkdown", () => {
  test("round-trips the demo content: parse(toMarkdown(content)) is identity", () => {
    const resume = resumeSchema.parse(master);
    expect(parseClean(resumeToMarkdown(resume))).toEqual(master);
  });

  test("round-trips every construct, including ones the demo content lacks", () => {
    const resume = buildResume({
      header: {
        name: "Test Person",
        subtitle: ["One", "Two: with a colon"],
        monomark: "TP",
        contact: { email: "test@example.com", links: [{ url: "https://x.example", label: "x" }] },
      },
      sections: [
        { kind: "skills", label: "Skills", bullets: ["A", "**B** c"] },
        {
          kind: "experiences",
          label: "Experience",
          entries: [
            { title: "Lead", organization: "Org", dateRange: "2020–2021", summary: "Did things.", bullets: ["x"] },
            { title: "Fellow at VfA", bullets: [] },
            { title: "Dated only", dateRange: "2019", bullets: ["y"] },
          ],
        },
        { kind: "projects", label: "Community", entries: [{ title: "P", bullets: ["z"] }] },
        { kind: "education", label: "Education", entries: [{ title: "School" }, { title: "Course", bullets: ["w"] }] },
      ],
    });
    expect(parseClean(resumeToMarkdown(resume))).toEqual(resume);
  });

  test("the worked example in docs/markdown-dialect.md is the demo content", () => {
    const section = dialect.slice(dialect.indexOf("## Worked example"));
    const fence = /```markdown\n([\s\S]*?)```/.exec(section);
    if (!fence) throw new Error("docs/markdown-dialect.md has no ```markdown fence under Worked example");
    expect(fence[1]).toBe(resumeToMarkdown(resumeSchema.parse(master)));
    expect(parseClean(fence[1])).toEqual(master);
  });

  test("an explicit kind marker wins over the label", () => {
    const resume = parseClean(
      `${frontmatter}\n\n## Experience\n<!-- kind: projects -->\n\n### P\n\n- z\n`,
    );
    expect(resume).toEqual({
      header: minimalHeader,
      sections: [{ kind: "projects", label: "Experience", entries: [{ title: "P", bullets: ["z"] }] }],
    });
  });

  test("joins an editor-wrapped bullet back into one", () => {
    const resume = parseClean(`${frontmatter}\n\n## Skills\n\n- one long\n  bullet\n`);
    expect(resume).toEqual({
      header: minimalHeader,
      sections: [{ kind: "skills", label: "Skills", bullets: ["one long bullet"] }],
    });
  });

  test("the H1 may be omitted", () => {
    const resume = parseClean(`${frontmatter}\n\n## Skills\n\n- a\n`);
    expect(resume).toEqual({
      header: minimalHeader,
      sections: [{ kind: "skills", label: "Skills", bullets: ["a"] }],
    });
  });

  test("a quoted frontmatter value reads as its JSON string", () => {
    const resume = parseClean(
      `---\nname: "Quoted: Name"\nsubtitle:\ncontact:\n  email: test@example.com\n---\n`,
    );
    expect(resume).toEqual({ header: { ...minimalHeader, name: "Quoted: Name" }, sections: [] });
  });

  describe("issues name the line and the heading", () => {
    function issuesOf(markdown: string) {
      return parseResumeMarkdown(markdown).issues;
    }

    test("a missing frontmatter block", () => {
      const [issue] = issuesOf("# Someone\n\n## Skills\n\n- a\n");
      expect(issue).toMatchObject({ line: 1, heading: "frontmatter" });
      expect(issue.message).toContain("---");
    });

    test("a header field the schema wants, located at the nearest key", () => {
      const [issue] = issuesOf("---\nname: X\nsubtitle:\ncontact:\n  links:\n---\n");
      expect(issue).toMatchObject({ line: 4, heading: "frontmatter" });
      expect(issue.message).toContain("contact.email");
    });

    test("a label that names no kind, with the marker as the way out", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Community\n\n- a\n`);
      expect(issue).toMatchObject({ line: 8, heading: "## Community" });
      expect(issue.message).toContain("<!-- kind:");
      expect(issue.message).toContain("projects");
    });

    test("a marker naming a kind the schema lacks", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Community\n<!-- kind: awards -->\n`);
      expect(issue).toMatchObject({ line: 9, heading: "## Community" });
      expect(issue.message).toContain("awards");
    });

    test("an H1 that disagrees with the frontmatter name", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n# Someone Else\n`);
      expect(issue).toMatchObject({ line: 8 });
      expect(issue.message).toContain("Test Person");
    });

    test("bullets in an entry section with no entry above them", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Experience\n\n- stray\n`);
      expect(issue).toMatchObject({ line: 10, heading: "## Experience" });
      expect(issue.message).toContain("###");
    });

    test("an entry heading in a flat section", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Skills\n\n### Nope\n`);
      expect(issue).toMatchObject({ line: 10, heading: "## Skills" });
    });

    test("a paragraph under an entry kind with no summary field, attributed to the entry", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Projects\n\n### P\n\nA paragraph.\n`);
      expect(issue).toMatchObject({ line: 12, heading: "### P" });
      expect(issue.message).toContain("summary");
    });

    test("an organization under a kind whose entries have none", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Education\n\n### School\n**Org** · *2020*\n`);
      expect(issue).toMatchObject({ line: 11, heading: "### School" });
      expect(issue.message).toContain("organization");
    });

    test("a heading deeper than an entry", () => {
      const [issue] = issuesOf(`${frontmatter}\n\n## Projects\n\n### P\n\n#### Deeper\n`);
      expect(issue).toMatchObject({ line: 12, heading: "### P" });
    });

    test("every problem is reported, not only the first", () => {
      const issues = issuesOf(`${frontmatter}\n\n## Community\n\n- a\n\n## Skills\n\n### Nope\n`);
      expect(issues.map((issue) => issue.line)).toEqual([8, 14]);
    });
  });
});
