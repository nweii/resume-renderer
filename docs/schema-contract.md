# Content contract

Generated from `lib/schema.ts` by `bun run cli contract`. Do not edit by hand — edit the schema and regenerate. `bun run check` fails while this file is stale.

Reading a line: `?` marks an optional field, `/* … */` carries the field's prose, and a capitalized bare name (`Header`, `Contact`) is a shape defined under its own heading.

A content file is this shape as JSON, or as markdown in the dialect stated in `docs/markdown-dialect.md`, where each field below has one notation.

In markdown, a section's kind comes from a `<!-- kind: … -->` marker under its heading first, then from its label, then from its structure.

## Document shape

- resume({ header: Header, sections: Section[] })

## Header

- Header = { name: string, subtitle: string[] /* One logical line per item; the template joins with line breaks */, monomark?: string /* Short mark rendered as a logo */, contact: Contact }
- Contact = { email: string, links?: { url: string, label: string }[] }

## Section kinds (6)

- skills({ label: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — A labeled flat list of bullets
- projects({ label: string, entries: { title: string, dateRange?: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Titled entries with optional date ranges
- experiences({ label: string, entries: { title: string, organization?: string /* The employer, client, or institution the title was held with; omit when the title names its own */, dateRange?: string, summary?: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Roles with organization, summary, and bullets
- education({ label: string, entries: { title: string, dateRange?: string, bullets?: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Like projects, but bullets are optional per entry
- list({ label: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — A labeled flat list of bullets, for a section no named kind covers; in markdown, a heading outside the label table over bullets alone
- entries({ label: string, entries: { title: string, organization?: string /* The employer, client, or institution the title was held with; omit when the title names its own */, dateRange?: string, summary?: string, bullets?: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Labeled entries in the widest entry shape, for a section no named kind covers; in markdown, a heading outside the label table over `###` entries
