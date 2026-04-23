# Resume renderer

JSON file in, rendered resume out (web page + print-ready PDF via browser print). Built for iteration velocity in an agent loop (edit JSON, hot-reload, eyeball, repeat). The template is plain React and Tailwind.

This is primarily a personal tool. The code is public as portfolio evidence and as a reference for anyone who wants to fork the same shape for themselves.

## Running it

```bash
bun install
bun dev       # http://localhost:3000, hot reload on JSON + code edits
bun test      # runs the bun:test suite (schema + variant registry)
```

Edit `resumes/default.json` and the page hot-reloads.

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

`resumes/default.json` is the canonical resume content. It's validated at render time against the Zod schema in `lib/schema.ts`; schema failures surface as a readable error page with a list of issues.

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

Bullet strings support a single inline convention: `**text**` renders as bold. Whichever template renders bullets owns the parser at render time. No other inline formatting (italics, links, code) is supported; widen the convention in that template (in this repo, see `renderRichText` in [`templates/playroom/index.tsx`](templates/playroom/index.tsx)) if you need more.

```json
"**Built portfolio system** (Next.js + Sanity CMS) presenting multi-medium career collections"
```

Read `resumes/default.json` for a full worked example of every section kind.

## Customizing this for yourself

Five knobs. Everything else is framework.

1. **Your content** — rewrite `resumes/default.json`. See the schema in `lib/schema.ts` for the exact shape.
2. **Your monomark / logo** — replace `public/monomark.svg`. Update the reference in `resumes/default.json` (`header.monomark`) if you rename the file.
3. **Theme colors** — variants set a `themeId` in [`lib/resume-variants.ts`](lib/resume-variants.ts). The page root gets `data-resume-theme="<id>"`; match that id in [`app/globals.css`](app/globals.css) with a block of CSS custom properties (this repo uses a `--t-<id>-*` prefix per theme). Templates point section accents and surfaces at those variables. Two routes can reuse the same `templateId` with different `themeId` values if you define both theme blocks.
4. **Page metadata** — `app/layout.tsx` sets the `<title>` and `<meta description>`. Update to your name.
5. **Fonts** — `lib/fonts.ts` wires up fonts via `next/font`. Funnel Sans (Google Fonts) for body, Nimbus Sans Extended (local woff2 files in `public/fonts/`) for the display `<h1>`. Swap either or both; the Tailwind theme tokens in `app/globals.css` (`--font-sans`, `--font-display`) are the mapping layer.

Beyond these knobs, everything is regular React and Tailwind. Restyling section headers, changing the grid, adding print-only elements, swapping in a different font stack — all of it is component work under `templates/` and `app/globals.css`. [`app/page.tsx`](app/page.tsx) and [`app/[variant]/page.tsx`](app/[variant]/page.tsx) stay thin: they resolve a variant from [`lib/resume-variants.ts`](lib/resume-variants.ts), validate its JSON, and render whichever template id the variant selects.

### Templates

- **`templates/<id>/`** — one folder per layout. Each exports `shell` (outer layout classes) and `Document` (the resume body) consumed by [`templates/index.ts`](templates/index.ts).
- **`templates/index.ts`** — maps template ids to those exports. Variants set `templateId` in [`lib/resume-variants.ts`](lib/resume-variants.ts); add a folder, register it, then point routes at the new id. This repo ships a single letter-size layout as the starting point (`playroom`); a second template would get its own folder, registry entry, and optional parallel `--t-<theme>-*` block in CSS if it needs a separate token set.

The agent feedback toolbar (`Agentation` in `app/layout.tsx`) is dev-only and can be removed if you don't use it.

### Variant paths

[`lib/resume-variants.ts`](lib/resume-variants.ts) is the single source of truth for public paths. Each entry maps one URL slug to a resume JSON file, template id, and theme id.

- `/` renders the default variant.
- `/default` renders the same canonical resume through the path-based variant mechanism.

To add another public route, duplicate the `default` entry, point `resume` at another imported JSON file, then change `slug`, `pathname`, and optionally `templateId` / `themeId`. Static export picks it up through `generateStaticParams()` automatically.

## Adding a new section kind

The schema is shared; every HTML template and the Markdown serializer must understand each `kind` you add. The discriminated union keeps schema, renderers, and `.md` output in type-lockstep.

1. **`lib/schema.ts`** — add a new section variant to the `sectionSchema` discriminated union. Give it a unique `kind` literal and whatever entry shape you need.
2. **Each registered template** in [`templates/index.ts`](templates/index.ts) — add a `case` in that template’s `Document` switch (and any accent map / section styling your layout uses). If the new kind matches an existing shape (title + optional dateRange/summary/bullets per entry), reuse the same patterns as other sections; otherwise add a small dedicated block.
3. **`app/globals.css`** — if your themes use per-section CSS variables for the new kind, define them under each `[data-resume-theme="…"]` block that should support it (light, dark, `@media print` as needed).
4. **`lib/resume-markdown.ts`** — add a `case` to the `renderSection` switch so the new kind serializes into the `.md` endpoint (shared default unless a template supplies its own `toMarkdown`).

TypeScript will tell you if you miss a switch arm — exhaustiveness is checked against the union.

## Data endpoints

Every variant exposes three representations so agents, scripts, and downstream tools can consume the resume without scraping HTML:

| URL                      | Format   | Notes                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------- |
| `/` · `/<slug>`          | HTML     | The rendered template.                                                |
| `/resume.json` · `/<slug>/resume.json` | JSON     | Schema-validated data, pretty-printed. Parse against `lib/schema.ts`. |
| `/resume.md` · `/<slug>/resume.md`     | Markdown | Stable outline: H1 name · H2 section · H3 entry · `-` bullets.         |

The Markdown converter lives in [`lib/resume-markdown.ts`](lib/resume-markdown.ts) and is schema-driven by default so new templates get `.md` support without a custom serializer unless they need one. A template can export an optional `toMarkdown` in [`templates/index.ts`](templates/index.ts) when its outline genuinely diverges (reordered sections, merged section kinds, etc.). The inline `**bold**` convention used in bullets is already valid Markdown, so it passes through unchanged.

All endpoints are built as static files by `next build` (`output: "export"`), so they're served directly from the CDN with no Worker execution cost.

## Variants

`resumes/default.json` is the canonical public resume. Tailored-per-role variants (`backend-staff.json`, `design-lead.json`, etc.) are gitignored by convention — see `.gitignore`. They live in the same folder on your machine but don't land in public git history.

Variants are independent artifacts, not filtered views of the default. Each one is a hand-tuned whole file. Duplication is intentional; it buys freedom to trim, reorder, and re-emphasize per role without side effects on other variants.

## Overflow and page fit

The shipped layout targets a single 8.5 × 11 inch page (US letter). In `bun dev`, `app/PageEdge.tsx` measures the article on render and, if content exceeds 11 inches, draws a red dashed rule at the boundary labelled with the overflow magnitude (e.g. `OVERFLOWS BY 0.42IN`). When content fits, nothing appears. The indicator is stripped from production builds so the deployed page stays clean. Chrome's print pipeline paginates naturally if content spills past; `print:break-inside-avoid` on entry wrappers keeps chunks from splitting mid-entry. A different template can choose its own page model; the overlay assumes a single-page intent aligned with how that template sizes the article.

A measurement signal shared with `bun test` is planned but deferred: [`@chenglou/pretext`](https://www.npmjs.com/package/@chenglou/pretext) is the right primitive, but its server-side story isn't yet shipped (as of v0.0.5). When it lands, the plan is a `lib/measure.ts` shared by the dev-only overlay and a test assertion — so an agent iterating on content can fail a test rather than needing to look at a screen.

## Project docs

- `AGENTS.md` — conventions for agents (including humans) working in this repo.
- `docs/working-log.md` — living record of implementation decisions. Append when finishing meaningful blocks.
- `docs/usage/` — standalone notes on design thinking and open questions.

## Stack

Next.js 16 (App Router, static export), React 19, Tailwind v4, Zod 4, Bun as the runtime / package manager.

## License

MIT. See `LICENSE`.
