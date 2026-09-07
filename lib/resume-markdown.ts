// ABOUTME: The markdown dialect, both directions. `resumeToMarkdown` writes
// validated content as markdown (the `.md` data endpoints, working copies);
// `parseResumeMarkdown` reads the dialect back into content for the schema to
// validate, reporting problems by line and heading. The two are inverses:
// parse(toMarkdown(content)) equals content. docs/markdown-dialect.md is the
// adopter-facing statement of the dialect; keep the two in step.
//
// Both directions read the schema for what each section kind holds — a flat
// `bullets` list or `entries`, and which entry fields exist — so a kind built
// from the same vocabulary of fields needs no new code here. Only a field with
// no notation yet (title, organization, dateRange, summary, bullets) does.
// The one thing here that knows what content means is `sectionKindLabels`,
// the label-to-kind table; it is the adopter's to edit.

import { z } from "zod";

import { formatFrontmatter, parseFrontmatter } from "@/lib/frontmatter";
import { resumeSchema, sectionSchema, type Resume, type Section } from "@/lib/schema";

/**
 * Outline contract (stable across the default converter and template
 * overrides so agents can parse without knowing which template emitted it):
 * - frontmatter — the header, keys as in the schema
 * - `# name` — H1 echoes the name so any markdown theme previews it
 * - `## label` — H2 is a section label; `<!-- kind: x -->` beneath it when the
 *   label alone does not say the kind
 * - `### title` — H3 is an entry, with an optional `**organization** · *dateRange*`
 *   line beneath it, then a summary paragraph, then bullets
 * - `- text` — bullets within entries or flat sections
 *
 * Inline `**bold**` in bullets is valid markdown already and passes through.
 * Provenance fields (`source`, `derivedFrom`) have no notation and are dropped.
 */
export function resumeToMarkdown(resume: Resume): string {
  const header = [formatFrontmatter(resume.header), `# ${resume.header.name}`].join("\n\n");
  return [header, ...resume.sections.map(renderSection)].join("\n\n") + "\n";
}

/**
 * Section labels that name their kind on their own, normalized (lowercase,
 * single spaces, no trailing punctuation). A label outside this table needs
 * an explicit `<!-- kind: x -->` marker. Adopters extend this with the labels
 * their variants use; a new section kind gets a row, and TypeScript insists.
 */
export const sectionKindLabels: Record<Section["kind"], readonly string[]> = {
  skills: ["skills", "skill", "core skills", "tools", "tools and skills", "skills and tools"],
  projects: ["projects", "project", "selected projects", "selected project", "selected work"],
  experiences: ["experience", "experiences", "work experience", "work", "employment", "professional experience"],
  education: ["education", "education and training", "certifications"],
};

export function resolveSectionKind(label: string): Section["kind"] | undefined {
  const normalized = label.toLowerCase().replace(/\s+/g, " ").replace(/[:.]+$/, "").trim();
  for (const [kind, labels] of Object.entries(sectionKindLabels)) {
    if (labels.includes(normalized)) return kind as Section["kind"];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/** The entry fields with a notation. Every entry type in the schema fits this. */
type EntryFields = {
  title: string;
  organization?: string;
  dateRange?: string;
  summary?: string;
  bullets?: string[];
};

function renderSection(section: Section): string {
  const head =
    resolveSectionKind(section.label) === section.kind
      ? `## ${section.label}`
      : `## ${section.label}\n<!-- kind: ${section.kind} -->`;
  if ("entries" in section) {
    return joinBlocks(head, ...section.entries.map((entry) => renderEntry(entry)));
  }
  return joinBlocks(head, bulletList(section.bullets));
}

function renderEntry(entry: EntryFields): string {
  const meta = [
    entry.organization && `**${entry.organization}**`,
    entry.dateRange && `*${entry.dateRange}*`,
  ].filter(Boolean);
  const head = meta.length > 0 ? `### ${entry.title}\n${meta.join(" · ")}` : `### ${entry.title}`;
  return joinBlocks(head, entry.summary ?? "", bulletList(entry.bullets ?? []));
}

function bulletList(bullets: string[]): string {
  return bullets.map((bullet) => `- ${bullet}`).join("\n");
}

function joinBlocks(...blocks: string[]): string {
  return blocks.filter((block) => block.length > 0).join("\n\n");
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type MarkdownIssue = {
  /** 1-based line in the file. */
  line: number;
  /** The nearest heading above the line (`## Experience`, `### Title`), or `frontmatter`. */
  heading?: string;
  message: string;
};

export type ParsedResumeMarkdown = { resume: unknown; issues: MarkdownIssue[] };

/**
 * Reads the dialect into content shaped for `resumeSchema`. Never throws:
 * every problem lands in `issues`, and `resume` holds what did parse. A
 * caller validates `resume` against the schema only when `issues` is empty.
 */
export function parseResumeMarkdown(text: string): ParsedResumeMarkdown {
  return new Parser(text.split("\n")).parse();
}

/** What the schema says a section kind holds, read once per kind. */
type KindShape = {
  kind: string;
  /** A flat `bullets` list at section level, instead of `entries`. */
  flat: boolean;
  /** Entry field name → whether the schema requires it. Empty when flat. */
  entry: Map<string, boolean>;
};

const kindShapes: Map<string, KindShape> = new Map(
  sectionSchema.options.map((option) => {
    const shape = option.shape as Record<string, z.ZodType>;
    const kind = (shape.kind as z.ZodLiteral<string>).value;
    const entries = shape.entries;
    const entry = new Map<string, boolean>();
    if (entries instanceof z.ZodArray && entries.element instanceof z.ZodObject) {
      for (const [name, field] of Object.entries(entries.element.shape as Record<string, z.ZodType>)) {
        entry.set(name, !(field instanceof z.ZodOptional));
      }
    }
    return [kind, { kind, flat: entries === undefined, entry }];
  }),
);

const HEADING = /^(#{1,6})\s+(.*?)\s*$/;
const KIND_MARKER = /^<!--\s*kind:\s*([\w-]+)\s*-->$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
/**
 * `**organization** · *dateRange*`, either half optional. The separator may also be `—`, `-`, `|`, or `,`
 * (surrounding spaces optional); the writer emits `·`.
 */
const META = /^(?:\*\*(.+?)\*\*)?(?:\s*[·—|,-]\s*)?(?:\*([^*].*?)\*)?$/;

type OpenSection = {
  heading: string;
  shape: KindShape;
  value: Record<string, unknown>;
  entries: Record<string, unknown>[];
  bullets: string[];
};

type OpenEntry = {
  heading: string;
  value: EntryFields;
  bullets: string[];
};

class Parser {
  private readonly issues: MarkdownIssue[] = [];
  private readonly sections: Record<string, unknown>[] = [];
  private header: Record<string, unknown> = {};
  /** The open section, or undefined between sections and while one is skipped. */
  private section: OpenSection | undefined;
  /** The nearest `## ` heading, kept for issue attribution even when skipped. */
  private sectionHeading: string | undefined;
  /** Line of a `## ` heading whose label named no kind, until a marker or content decides. */
  private unresolved: number | undefined;
  /** Set once a section's kind is unknown; its lines are ignored to the next `## `. */
  private skipping = false;
  private entry: OpenEntry | undefined;
  private sawTitle = false;
  /** True on the line after a `## ` heading, the one place a kind marker may sit. */
  private awaitingMarker = false;
  private awaitingMeta = false;
  private last: "bullet" | "paragraph" | "other" = "other";
  private line = 0;

  constructor(private readonly lines: string[]) {}

  parse(): ParsedResumeMarkdown {
    const start = this.parseHeader();
    for (let index = start; index < this.lines.length; index += 1) {
      this.line = index + 1;
      this.parseLine(this.lines[index]);
    }
    this.closeSection();
    return { resume: { header: this.header, sections: this.sections }, issues: this.issues };
  }

  /** Reads the frontmatter and checks it against the header schema. Returns the first body line index. */
  private parseHeader(): number {
    const frontmatter = parseFrontmatter(this.lines);
    if (!frontmatter) {
      this.issues.push({
        line: 1,
        heading: "frontmatter",
        message:
          "the file must open with a `---` frontmatter block holding the header (name, subtitle, contact); see docs/markdown-dialect.md",
      });
      return 0;
    }
    for (const issue of frontmatter.issues) {
      this.issues.push({ line: issue.line, heading: "frontmatter", message: issue.message });
    }
    this.header = frontmatter.value;
    const result = resumeSchema.shape.header.safeParse(frontmatter.value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.map(String);
        // The deepest key that exists names the line; a missing key is
        // reported at its parent, or at the opening fence.
        let line = 1;
        for (let depth = path.length; depth > 0; depth -= 1) {
          const known = frontmatter.lines.get(path.slice(0, depth).join("."));
          if (known !== undefined) {
            line = known;
            break;
          }
        }
        this.issues.push({
          line,
          heading: "frontmatter",
          message: `${path.join(".") || "header"}: ${issue.message}`,
        });
      }
    }
    return frontmatter.length;
  }

  private parseLine(raw: string) {
    const text = raw.trimEnd();
    if (text.trim() === "") {
      if (this.last === "paragraph") this.last = "other";
      return;
    }

    const heading = HEADING.exec(text);
    if (heading) return this.parseHeading(heading[1].length, heading[2]);

    const marker = KIND_MARKER.exec(text.trim());
    if (marker) return this.parseKindMarker(marker[1]);
    this.awaitingMarker = false;
    this.settleLabel();

    if (this.skipping) return;

    const bullet = BULLET.exec(text);
    if (bullet) return this.parseBullet(bullet[1]);

    if (/^\s/.test(text) && this.last === "bullet") return this.continueBullet(text.trim());

    if (this.awaitingMeta) {
      const meta = META.exec(text.trim());
      if (meta && (meta[1] !== undefined || meta[2] !== undefined)) {
        return this.parseMeta(meta[1], meta[2]);
      }
    }

    return this.parseParagraph(text.trim());
  }

  private parseHeading(level: number, title: string) {
    this.awaitingMarker = false;
    this.awaitingMeta = false;
    this.last = "other";
    if (level === 2) return this.openSection(title);
    this.settleLabel();
    if (level === 1) {
      if (this.sectionHeading) {
        return this.fail(
          "a `# ` heading belongs above the first section; the H1 echoes the name from the frontmatter",
        );
      }
      if (this.sawTitle) return this.fail("only one `# ` heading; it echoes the name from the frontmatter");
      this.sawTitle = true;
      if (typeof this.header.name === "string" && this.header.name !== title) {
        return this.fail(
          `\`# ${title}\` does not match the frontmatter name \`${this.header.name}\`; the H1 only echoes it`,
        );
      }
      return;
    }
    if (this.skipping) return;
    if (level === 3) return this.openEntry(title);
    return this.fail(
      `\`${"#".repeat(level)} ${title}\`: headings go two levels deep; \`## \` opens a section and \`### \` an entry`,
    );
  }

  private openSection(label: string) {
    this.closeSection();
    this.sectionHeading = `## ${label}`;
    this.awaitingMarker = true;
    const kind = resolveSectionKind(label);
    if (kind) return this.startSection(label, kind);
    // The label alone says nothing; a marker on the next line may still.
    this.unresolved = this.line;
  }

  private startSection(label: string, kind: string) {
    this.skipping = false;
    this.unresolved = undefined;
    this.section = {
      heading: this.sectionHeading ?? `## ${label}`,
      shape: kindShapes.get(kind)!,
      value: { kind, label },
      entries: [],
      bullets: [],
    };
  }

  /** No marker followed an unresolved label: report it and skip the section. */
  private settleLabel() {
    if (this.unresolved === undefined) return;
    this.issues.push({
      line: this.unresolved,
      heading: this.sectionHeading,
      message: `\`${this.sectionHeading}\` does not name a section kind; put \`<!-- kind: … -->\` on the next line, one of: ${[...kindShapes.keys()].join(", ")}`,
    });
    this.unresolved = undefined;
    this.skipping = true;
  }

  private parseKindMarker(kind: string) {
    if (!this.awaitingMarker || !this.sectionHeading) {
      return this.fail("`<!-- kind: … -->` goes on the line right after a `## ` heading");
    }
    this.awaitingMarker = false;
    if (!kindShapes.has(kind)) {
      this.unresolved = undefined;
      this.section = undefined;
      this.skipping = true;
      return this.fail(`\`${kind}\` is not a section kind; one of: ${[...kindShapes.keys()].join(", ")}`);
    }
    // An explicit marker wins over whatever the label said.
    this.startSection(this.sectionHeading.slice(3), kind);
  }

  private openEntry(title: string) {
    this.closeEntry();
    const section = this.section;
    if (!section) {
      return this.fail(`\`### ${title}\` sits before the first \`## \` section heading`);
    }
    if (section.shape.flat) {
      return this.fail(
        `\`${section.heading}\` is a flat list (${section.shape.kind}); it takes bullets, not \`### \` entries`,
      );
    }
    this.entry = { heading: `### ${title}`, value: { title }, bullets: [] };
    this.awaitingMeta = true;
  }

  private parseMeta(organization: string | undefined, dateRange: string | undefined) {
    this.awaitingMeta = false;
    this.last = "other";
    const { section, entry } = this;
    if (!section || !entry) return;
    if (organization !== undefined) {
      if (!section.shape.entry.has("organization")) {
        return this.fail(
          `${section.shape.kind} entries have no organization; \`**${organization}**\` has nowhere to go`,
        );
      }
      entry.value.organization = organization;
    }
    if (dateRange !== undefined) {
      if (!section.shape.entry.has("dateRange")) {
        return this.fail(`${section.shape.kind} entries have no date range; \`*${dateRange}*\` has nowhere to go`);
      }
      entry.value.dateRange = dateRange;
    }
  }

  private parseBullet(text: string) {
    this.awaitingMeta = false;
    this.last = "bullet";
    const section = this.section;
    if (!section) return this.fail("a bullet sits before the first `## ` section heading");
    if (section.shape.flat) {
      section.bullets.push(text);
      return;
    }
    const entry = this.entry;
    if (!entry) {
      return this.fail(`bullets under \`${section.heading}\` belong to an entry; add a \`### \` heading above them`);
    }
    if (!section.shape.entry.has("bullets")) {
      return this.fail(`${section.shape.kind} entries have no bullets`);
    }
    entry.bullets.push(text);
  }

  /** An indented line right after a bullet is that bullet, wrapped by an editor. */
  private continueBullet(text: string) {
    const target = this.section?.shape.flat ? this.section.bullets : this.entry?.bullets;
    if (!target || target.length === 0) return;
    target[target.length - 1] += ` ${text}`;
  }

  private parseParagraph(text: string) {
    this.awaitingMeta = false;
    const section = this.section;
    const joiner = this.last === "paragraph" ? "\n" : "\n\n";
    this.last = "paragraph";
    if (!section) return this.fail("text sits before the first `## ` section heading");
    if (section.shape.flat) {
      return this.fail(
        `\`${section.heading}\` is a flat list (${section.shape.kind}); it takes \`- \` bullets, not paragraphs`,
      );
    }
    const entry = this.entry;
    if (!entry) {
      return this.fail(`text under \`${section.heading}\` belongs to an entry; add a \`### \` heading above it`);
    }
    if (!section.shape.entry.has("summary")) {
      return this.fail(
        `${section.shape.kind} entries have no summary paragraph; make this a \`- \` bullet or drop it`,
      );
    }
    entry.value.summary = entry.value.summary === undefined ? text : `${entry.value.summary}${joiner}${text}`;
  }

  private closeEntry() {
    const { section, entry } = this;
    this.entry = undefined;
    this.awaitingMeta = false;
    if (!section || !entry) return;
    const value: Record<string, unknown> = { ...entry.value };
    // A required list is present even when empty; an optional one is absent.
    if (entry.bullets.length > 0 || section.shape.entry.get("bullets") === true) {
      value.bullets = entry.bullets;
    }
    section.entries.push(value);
  }

  private closeSection() {
    this.settleLabel();
    this.closeEntry();
    const section = this.section;
    this.section = undefined;
    this.skipping = false;
    if (!section) return;
    this.sections.push(
      section.shape.flat
        ? { ...section.value, bullets: section.bullets }
        : { ...section.value, entries: section.entries },
    );
  }

  private fail(message: string) {
    this.issues.push({ line: this.line, heading: this.entry?.heading ?? this.sectionHeading, message });
  }
}
