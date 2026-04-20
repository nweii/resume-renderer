# Resume renderer

JSON file in, rendered resume out (web page + print-ready PDF via browser print). Built for iteration velocity in an agent loop (edit JSON, hot-reload, eyeball, repeat). The template is plain React and Tailwind.

This is primarily a personal tool. The code is public as portfolio evidence and as a reference for anyone who wants to fork the same shape for themselves.

## Running it

```bash
bun install
bun dev
```

Open `http://localhost:3000`. Edit `resumes/master.json` and the page hot-reloads.

### Deploy (Cloudflare Workers)

Production is a static export (`next.config.ts` sets `output: "export"` → `out/`). [`wrangler.toml`](wrangler.toml) points Workers [static assets](https://developers.cloudflare.com/workers/static-assets/) at that folder.

```bash
bunx wrangler login   # once per machine
bun run deploy        # build + wrangler deploy
```

You get a `*.workers.dev` URL by default. Attach a custom hostname in the Cloudflare dashboard (Workers → your worker → **Domains & Routes**). To serve the same build from a path on another site (e.g. `nathancheng.work/resume` while the portfolio stays on Vercel), add a rewrite or proxy rule on the portfolio host to this deployment’s origin — no change required in this repo.

`bun run preview:cf` builds and runs `wrangler dev` against `out/` for a local smoke test of the Worker asset pipeline.

### Export PDF

Open the rendered page in Chrome → `⌘P` → **Margins: None**, **Scale: 100**, **Background graphics: on** → Save as PDF. The `@page { size: letter; margin: 0 }` rule in `app/globals.css` takes care of the page box; without the "Margins: None" setting Chrome stacks its own margins on top and the layout doubles up.

## The data model

`resumes/master.json` is the canonical resume content. It's validated at render time against the Zod schema in `lib/schema.ts`; schema failures surface as a readable error page with a list of issues.

Top-level shape:

```ts
{
  header: { name, subtitle: string[], monomark?, contact: { email, website? } },
  sections: Section[]  // discriminated union on `kind`
}
```

Four section kinds, each with its own entry shape:

- `skills` — `bullets: string[]`
- `projects` — `entries: { title, dateRange?, bullets }[]`
- `experiences` — `entries: { title, organization?, dateRange?, summary?, bullets }[]`
- `education` — `entries: { title, dateRange?, bullets? }[]`

Every section and entry can optionally carry `source` / `derivedFrom` fields. Nothing consumes them today — they're a hook for future authoring tools (e.g. a narrative system that produces resume JSON) to leave provenance breadcrumbs.

### Inline bold in bullets

Bullet strings support a single inline convention: `**text**` renders as bold. The active template parses this at render time. No other inline formatting (italics, links, code) is supported; widen the convention in `renderRichText` in [`templates/current/sections.tsx`](templates/current/sections.tsx) if you need more.

```json
"**Built portfolio system** (Next.js + Sanity CMS) presenting multi-medium career collections"
```

Read `resumes/master.json` for a full worked example of every section kind.

## Customizing this for yourself

Five knobs. Everything else is framework.

1. **Your content** — rewrite `resumes/master.json`. See the schema in `lib/schema.ts` for the exact shape.
2. **Your monomark / logo** — replace `public/monomark.svg`. Update the reference in `resumes/master.json` (`header.monomark`) if you rename the file.
3. **Theme colors** — for the default full-page template (`templates/current/`), section accents are `{ heading, bullet, line }` CSS variable references in [`templates/current/theme.ts`](templates/current/theme.ts), backed by OKLCH values under the `--t-current-*` namespace in [`app/globals.css`](app/globals.css) (light, dark, print). Each section kind gets one triple.
4. **Page metadata** — `app/layout.tsx` sets the `<title>` and `<meta description>`. Update to your name.
5. **Fonts** — `lib/fonts.ts` wires up fonts via `next/font`. Funnel Sans (Google Fonts) for body, Nimbus Sans Extended (local woff2 files in `public/fonts/`) for the display `<h1>`. Swap either or both; the Tailwind theme tokens in `app/globals.css` (`--font-sans`, `--font-display`) are the mapping layer.

Beyond these knobs, everything is regular React and Tailwind. Restyling section headers, changing the grid, adding print-only elements, swapping in a different font stack — all of it is component work under `templates/` and `app/globals.css`. [`app/page.tsx`](app/page.tsx) stays a thin shell: it validates JSON and renders whichever template is selected in [`templates/index.ts`](templates/index.ts) (`activeResumeTemplateId`).

### Templates

- **`templates/current/`** — the letter-size resume layout (header, section dividers, blocks, rich text). CSS tokens for this template use the `--t-current-*` prefix so another full template can ship its own token set later.
- **`templates/index.ts`** — registry of full templates and the code-selected active entry (`activeResumeTemplateId`). To try a different template implementation, add it here and point `activeResumeTemplateId` at its key.

The agent feedback toolbar (`Agentation` in `app/layout.tsx`) is dev-only and can be removed if you don't use it.

## Adding a new section kind

Three touchpoints for the default template (plus CSS values for the new accent variables). The discriminated union in the schema keeps the schema and renderer in type-lockstep.

1. **`lib/schema.ts`** — add a new section variant to the `sectionSchema` discriminated union. Give it a unique `kind` literal and whatever entry shape you need.
2. **`templates/current/theme.ts`** — add a `{ heading, bullet, line }` entry for your section kind, and define matching `--t-current-…` variables in `app/globals.css` (including dark and `@media print` blocks).
3. **`templates/current/sections.tsx`** — add a block component (e.g. `PublicationsBlock`) and a `case` in `CurrentResumeDocument`'s `switch` that renders it.

TypeScript will tell you if you miss one — the switch is exhaustive against the union.

## Variants

`resumes/master.json` is the canonical public resume. Tailored-per-role variants (`backend-staff.json`, `design-lead.json`, etc.) are gitignored by convention — see `.gitignore`. They live in the same folder on your machine but don't land in public git history.

Variants are independent artifacts, not filtered views of master. Each one is a hand-tuned whole file. Duplication is intentional; it buys freedom to trim, reorder, and re-emphasize per role without side effects on other variants.

## Overflow and page fit

The template targets a single 8.5 × 11 inch page (US letter). In `bun dev`, `app/PageEdge.tsx` measures the article on render and, if content exceeds 11 inches, draws a red dashed rule at the boundary labelled with the overflow magnitude (e.g. `OVERFLOWS BY 0.42IN`). When content fits, nothing appears. The indicator is stripped from production builds so the deployed page stays clean. Chrome's print pipeline paginates naturally if content spills past; `print:break-inside-avoid` on entry wrappers keeps chunks from splitting mid-entry.

A measurement signal shared with `bun test` is planned but deferred: [`@chenglou/pretext`](https://www.npmjs.com/package/@chenglou/pretext) is the right primitive, but its server-side story isn't yet shipped (as of v0.0.5). When it lands, the plan is a `lib/measure.ts` shared by the dev-only overlay and a test assertion — so an agent iterating on content can fail a test rather than needing to look at a screen.

## Project docs

- `AGENTS.md` — conventions for agents (including humans) working in this repo.
- `docs/working-log.md` — living record of implementation decisions. Append when finishing meaningful blocks.
- `docs/usage/` — standalone notes on design thinking and open questions.

## Stack

Next.js 16 (App Router, static export), React 19, Tailwind v4, Zod 4, Bun as the runtime / package manager.

## License

MIT. See `LICENSE`.
