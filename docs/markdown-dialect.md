# Markdown dialect

A variant's content file can be markdown instead of JSON. The schema in `lib/schema.ts` (stated for agents in `docs/schema-contract.md`) stays the contract; this dialect is a notation for it. Every construct below maps to one field, so a file in this dialect is canonical content, with no reconciliation step. The parser in `lib/resume-markdown.ts` is deterministic and reports problems by line and heading. The same module writes the dialect: `/resume.md` and any working copy an agent generates come out in it, and `parse(write(content))` returns `content`.

The dialect is plain CommonMark plus a frontmatter block. Any markdown editor renders it without plugins, and its heading outline (H1 name, H2 sections, H3 entries) is the one common resume themes expect.

## The file

```markdown
---
name: …
subtitle:
  - …
contact:
  email: …
---

# Name

## Section label

### Entry title
**Organization** · *Date range*

Summary paragraph.

- Bullet
- Bullet
```

One frontmatter block, then sections. Blank lines between blocks are conventional, not required.

## Header: the frontmatter

The block between the two `---` lines holds the header, with the keys and nesting of the schema's `Header` shape:

```markdown
---
name: Mira Sedgewick
subtitle:
  - Operations designer · Minneapolis, Minnesota
monomark: MS
contact:
  email: mira.sedgewick@example.com
  links:
    - url: https://example.com/mira-sedgewick
      label: example.com/mira-sedgewick
---
```

`name`, `subtitle`, and `contact.email` are required. `monomark` and `contact.links` are optional; leave the key out when there is nothing to say. `subtitle` is a list, one item per rendered line, and an empty list is the bare key `subtitle:` with nothing under it.

The block is the subset of YAML shown here, not all of YAML:

- `key: value` on one line, two-space indentation for nesting.
- `- item` for list items. A list of objects puts the first key on the `- ` line and the rest two spaces further in.
- Every value is a string. Quote a value with double quotes only when it is empty, starts with `"`, `'`, `#`, `-`, `[`, or `{`, has leading or trailing spaces, or contains `: `; a quoted value is read as a JSON string (`"He said \"hi\""`).
- Comments, anchors, multi-line scalars, and flow syntax (`[a, b]`, `{a: b}`) are not part of the dialect.

## The name as H1

An optional `# Name` line may follow the frontmatter. It exists so a markdown theme previews the name; the frontmatter is the source, and the H1 must repeat it exactly. Only one H1, and it sits before the first section.

## Sections: `##`

Each `## ` heading opens a section. The heading text is the section's `label`, rendered as written. The section's `kind` comes from the label through the table in `sectionKindLabels` (`lib/resume-markdown.ts`), matched case-insensitively with trailing punctuation ignored:

| Kind | Labels |
| --- | --- |
| `skills` | Skills, Skill, Core skills, Tools, Tools and skills, Skills and tools |
| `projects` | Projects, Project, Selected projects, Selected project, Selected work |
| `experiences` | Experience, Experiences, Work experience, Work, Employment, Professional experience |
| `education` | Education, Education and training, Certifications |

Any other label needs the kind stated on the next line, as an HTML comment. Editors render nothing for it:

```markdown
## Community
<!-- kind: projects -->
```

A marker always wins over the label, so a label that is in the table can still be re-kinded. Add your own labels to the table rather than marking every section.

## What each kind holds

The schema decides what goes under a section, and the parser reads the schema. A kind with a section-level `bullets` field (`skills`) is a flat list: bullets straight under the `## ` heading, no `### ` entries. A kind with `entries` takes `### ` entries and nothing else at section level.

Within an entry, each field has one notation:

| Field | Notation |
| --- | --- |
| `title` | The `### ` heading text |
| `organization` | `**Organization**` on the line right after the heading |
| `dateRange` | `*Date range*` on that same line; with an organization, `**Organization** · *Date range*` |
| `summary` | A paragraph of plain text before the bullets |
| `bullets` | `- ` list items |

The organization-and-date line counts only as the first non-blank line after the `### ` heading, and only when it consists of nothing but those two forms. Either half may stand alone. A kind whose entries lack a field rejects that notation: an `**Organization**` under `education` is an error, and so is a paragraph under `projects`.

Bullets are one line each. A bullet an editor has hard-wrapped, with its continuation lines indented, reads as one bullet. Both `- ` and `* ` mark a bullet. `**bold**` inside a bullet is the one inline convention the schema allows; it passes through untouched.

An entry with no bullets is written with none. For a kind that requires `bullets`, the parser supplies an empty list; for a kind where they are optional (`education`), the field is absent.

## What the dialect cannot say

- Provenance fields (`source`, `derivedFrom`) have no notation. A markdown content file carries none, and writing JSON content to markdown drops them.
- A summary paragraph that consists of nothing but `**bold**` or `*italic*` text on the line right after the `### ` heading reads as an organization-and-date line. Write the summary after a blank line, or with any plain word in it.
- Headings deeper than `###` are errors; the dialect has no use for them.

## Errors

The parser collects every problem and reports each with the line number and the nearest heading:

```text
resumes/backend.md: line 14 (## Experience) — bullets under `## Experience` belong to an entry; add a `### ` heading above them
resumes/backend.md: line 3 (frontmatter) — contact.email: Invalid input: expected string, received undefined
```

`bun run check` prints these for every registered markdown variant, and the page under `bun dev` shows the same list in place of the resume.

## Worked example

The demo content in `resumes/default.json`, as this dialect writes it. `bun test` fails if this block drifts from what `resumeToMarkdown` produces, or if parsing it back gives anything but the JSON.

```markdown
---
name: Mira Sedgewick
subtitle:
  - Operations designer · Minneapolis, Minnesota
contact:
  email: mira.sedgewick@example.com
  links:
    - url: tel:+12125550147
      label: (212) 555-0147
    - url: https://example.com/mira-sedgewick
      label: example.com/mira-sedgewick
---

# Mira Sedgewick

## Experience

### Senior operations designer
**Northline Cooperative** · *2021–Present*

Designs internal tools and service workflows for a regional building-supply network.

- **Redesigned the order exception workflow** used by 60 branch coordinators, reducing average resolution time from three days to one.
- **Built a shared service blueprint** across sales, dispatch, and support, clarifying ownership for 14 recurring customer issues.
- **Introduced monthly usability sessions** that give operations teams a direct role in prioritizing product changes.

### Product designer
**Juniper Ledger** · *2018–2021*

- **Led design for a small-business invoicing suite** from discovery through launch, working with two engineers and a product manager.
- **Created the team's first component library,** reducing repeated interface work and improving keyboard navigation across core flows.
- **Simplified account setup** from nine steps to five after interviews with new customers and support staff.

### Service design associate
**Harborlight Transit Lab** · *2015–2018*

- **Mapped rider support journeys** across web, phone, and station touchpoints for three municipal transit partners.
- **Prototyped clearer disruption alerts** that tested successfully with riders using screen readers and low-bandwidth devices.

## Selected project

### Shift Notes
*2023–Present*

- **Designed and built a lightweight handoff tool** for volunteer-run community kitchens using TypeScript and SQLite.
- **Piloted the tool with four teams,** then added printable summaries for kitchens without reliable device access.

## Skills

- **Design:** Service design, interaction design, research, facilitation, prototyping, information architecture, accessibility
- **Tools:** Figma, FigJam, TypeScript, React, HTML, CSS, SQL, Git

## Education

### B.S. in Industrial Design, Lakebridge College
*2011–2015*

### Certificate in Accessible Digital Services, Great Plains Extension
*2020*
```

## Registering a markdown variant

`bun run cli variant create <slug> --markdown` scaffolds `resumes/<slug>.md` and registers it; the registry entry's `resumeFile` ends in `.md` and its `resume` import brings in the file's text. To move an existing variant to markdown, save its `/resume.md` endpoint as `resumes/<slug>.md` (it is already in this dialect), change the entry's import and `resumeFile` to the new file, and add `!resumes/<slug>.md` to `.gitignore`.

Bun loads `.md` imports as text through the `[loader]` table in `bunfig.toml`; Turbopack does the same through the `*.md` rule in `next.config.ts` and `scripts/text-loader.js`; `lib/markdown-modules.d.ts` types them. Nothing else in the pipeline changes: `lib/resume-content.ts` parses markdown-sourced content before validating it, and templates see the same validated content either way.
