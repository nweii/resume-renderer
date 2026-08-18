# Content contract

Generated from `lib/schema.ts` by `bun run cli contract`. Do not edit by hand — edit the schema and regenerate. `bun run check` fails while this file is stale.

Reading a line: `?` marks an optional field, `/* … */` carries the field's prose, and a capitalized bare name (`Header`, `Contact`) is a shape defined under its own heading.

## Document shape

- resume({ header: Header, sections: Section[] })

## Header

- Header = { name: string, subtitle: string[] /* One logical line per item; the template joins with line breaks */, monomark?: string /* Short mark rendered as a logo */, contact: Contact }
- Contact = { email: string, links?: { url: string, label: string }[] }

## Section kinds (4)

- skills({ label: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — A labeled flat list of bullets
- projects({ label: string, entries: { title: string, dateRange?: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Titled entries with optional date ranges
- experiences({ label: string, entries: { title: string, organization?: string /* When set, renders `{title} at {organization}`; when absent, title stands alone */, dateRange?: string, summary?: string, bullets: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Roles with organization, summary, and bullets
- education({ label: string, entries: { title: string, dateRange?: string, bullets?: string[] /* Supports `**bold**` runs; no other inline formatting */, source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }[], source?: string /* Provenance; not rendered */, derivedFrom?: string /* Provenance; not rendered */ }) — Like projects, but bullets are optional per entry
