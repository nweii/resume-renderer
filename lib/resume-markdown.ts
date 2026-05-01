// ABOUTME: Schema-driven Markdown serialization for resumes. Default converter
// used by the `.md` data endpoints; templates may override via an optional
// `toMarkdown` in the template registry entry when they need a divergent shape.

import type {
  EducationSection,
  ExperiencesSection,
  ProjectsSection,
  Resume,
  Section,
  SkillsSection,
} from "@/lib/schema";

/**
 * Convert a validated resume to Markdown.
 *
 * Outline contract (stable across default + template overrides so agents can
 * parse without knowing which template emitted the doc):
 * - `# name` — H1 is always the person's name
 * - `## label` — H2 is a section label
 * - `### entry` — H3 is an entry within an entry-list section
 * - `- text` — bullets within entries or skills
 *
 * Inline `**bold**` in source bullets is valid Markdown already and passes
 * through verbatim — no conversion step.
 */
export function resumeToMarkdown(resume: Resume): string {
  const blocks = [renderHeader(resume.header), ...resume.sections.map(renderSection)];
  return blocks.join("\n\n") + "\n";
}

function renderHeader(header: Resume["header"]): string {
  const lines: string[] = [`# ${header.name}`];

  if (header.subtitle.length > 0) {
    // Two trailing spaces + newline is CommonMark's hard-line-break so
    // multi-line subtitles render as visually stacked lines in one paragraph.
    lines.push("", header.subtitle.join("  \n"));
  }

  const contactBits: string[] = [`<${header.contact.email}>`];
  for (const link of header.contact.links ?? []) {
    contactBits.push(`[${link.label}](${link.url})`);
  }
  lines.push("", contactBits.join(" · "));

  return lines.join("\n");
}

function renderSection(section: Section): string {
  const head = `## ${section.label}`;
  switch (section.kind) {
    case "skills":
      return joinBlocks(head, renderSkills(section));
    case "projects":
      return joinBlocks(head, ...section.entries.map(renderProjectEntry));
    case "experiences":
      return joinBlocks(head, ...section.entries.map(renderExperienceEntry));
    case "education":
      return joinBlocks(head, ...section.entries.map(renderEducationEntry));
  }
}

function renderSkills(section: SkillsSection): string {
  return bulletList(section.bullets);
}

function renderProjectEntry(entry: ProjectsSection["entries"][number]): string {
  return joinBlocks(entryHead(entry.title, entry.dateRange), bulletList(entry.bullets));
}

function renderExperienceEntry(entry: ExperiencesSection["entries"][number]): string {
  // Mirror the HTML template's "{title} at {organization}" composition when
  // organization is set, otherwise use the title as authored (which may
  // already contain its own phrasing like "VfA Fellowship").
  const headline = entry.organization ? `${entry.title} at ${entry.organization}` : entry.title;
  const head = entryHead(headline, entry.dateRange);

  const body: string[] = [];
  if (entry.summary) body.push(entry.summary);
  if (entry.bullets.length > 0) body.push(bulletList(entry.bullets));

  return body.length > 0 ? joinBlocks(head, ...body) : head;
}

function renderEducationEntry(entry: EducationSection["entries"][number]): string {
  const head = entryHead(entry.title, entry.dateRange);
  return entry.bullets && entry.bullets.length > 0 ? joinBlocks(head, bulletList(entry.bullets)) : head;
}

function entryHead(title: string, dateRange?: string): string {
  return dateRange ? `### ${title} — ${dateRange}` : `### ${title}`;
}

function bulletList(bullets: string[]): string {
  return bullets.map((bullet) => `- ${bullet}`).join("\n");
}

function joinBlocks(...blocks: string[]): string {
  return blocks.filter((block) => block.length > 0).join("\n\n");
}
