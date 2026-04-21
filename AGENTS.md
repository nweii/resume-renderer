<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resume renderer

An agent-operable primitive: one JSON file in, rendered resume out (web page + print-ready PDF via browser print).

## Purpose

Close the loop between "agent chat about the user's positioning" and "a resume draft that looks right." The value is iteration velocity — edit JSON, hot-reload, eyeball, repeat — not chat-pane UX. No GUI. Claude Code (or any MCP-enabled client later) is the operator.

## Session start

Before replying substantively to the first message in any session, orient from:

1. The most recent entry in `docs/working-log.md` — what changed recently.
2. The last one or two files in `docs/usage/` — what we're learning about the work. Scan filenames first; read the most recent in full.

If a usage note flags unresolved questions or thinking that's ahead of implementation, carry that forward rather than re-deriving it. When finishing a meaningful block of work, append a new entry to `docs/working-log.md` using the template at the top of that file.

## Repo map

- `app/` — Next 16 App Router. `page.tsx` renders the default variant; `[variant]/page.tsx` statically exports configured slugs. Both delegate to `app/ResumePage.tsx`, which validates JSON and renders a template.
- `resumes/` — one JSON file per content variant. `master.json` is canonical and public. Other files (`backend-staff.json`, etc.) are hand-tuned tailored variants and are **gitignored** by the `resumes/*.json` pattern in `.gitignore` — they live locally, never in public history.
- `templates/` — React components consuming the resume schema. Design-opinionated, Tailwind-based. The default full-page layout is `templates/current/`. The registry in `templates/index.ts` maps `templateId → { shell, Document }`; templates are selected per-variant, not globally.
- `lib/schema.ts` — Zod schema. The contract between agent-authored JSON and the renderer. Validation failures surface as a readable error page in dev; they become build failures in the static export.
- `lib/resume-variants.ts` — single source of truth for public URL paths. Each entry binds one slug to a resume JSON file, a `templateId`, and a `themeId`.
- `lib/resume-markdown.ts` — schema-driven default Markdown converter for the `.md` data endpoints. Templates can override via an optional `toMarkdown` in the registry; most won't need to.
- `lib/resume-responses.ts` — shared helpers that turn a variant into validated JSON / Markdown Responses. Used by the four `.json` / `.md` route handlers.
- `lib/fonts.ts`, `lib/site.ts` — font wiring and site metadata.
- `app/globals.css` — Tailwind layer, `@theme` tokens, and the `--t-current-*` CSS variable palette. Theme values are applied per route via `data-resume-theme`.
- `docs/working-log.md` — append-only decision log. `docs/usage/` — standalone design thinking.
- `README.md` — user-facing docs (fork knobs, section-kind recipe, deploy). Read before duplicating content into this file.

## Working in this repo

```bash
bun install
bun dev                 # http://localhost:3000, hot reload on JSON + code edits
bun test                # runs lib/resume-variants.test.ts etc. via bun:test
bun run build           # static export to out/
bun run deploy          # build + wrangler deploy to Cloudflare Workers
bun run preview:cf      # build + wrangler dev against out/ for a local Worker smoke test
bun run lint
```

### Editing resume content

1. Edit `resumes/master.json` (the public canonical) or any local tailored variant (`resumes/<role>.json`, gitignored).
2. Schema lives in `lib/schema.ts`. Top level: `{ header, sections[] }`. Sections are a discriminated union on `kind`: `skills`, `projects`, `experiences`, `education`. Read `lib/schema.ts` for exact shapes — don't guess from the JSON.
3. Inline formatting inside bullet strings: `**text**` renders as bold. No other inline syntax (no italics, links, code). The parser is `renderRichText` in `templates/current/index.tsx`; widen it there if a future convention is genuinely needed.
4. Schema failures render as a red error page in dev with the raw `issues` array — path + message + code per issue. That's the feedback surface; don't `console.log` your way around it.
5. Optional `source` / `derivedFrom` fields exist on every section and entry as provenance breadcrumbs for future authoring systems. Nothing consumes them today.

### Data endpoints (for agents consuming the resume)

Every variant exposes three representations. Use whichever fits the task:

- `GET /` (default) / `GET /<slug>` — HTML, human-readable.
- `GET /resume.json` (default) / `GET /<slug>/resume.json` — validated JSON, the schema-exact data. Parse against `lib/schema.ts`.
- `GET /resume.md` (default) / `GET /<slug>/resume.md` — Markdown. Stable outline contract: H1 = name, H2 = section label, H3 = entry, `- …` = bullets. Inline `**bold**` passes through as Markdown.

All endpoints are static files in the export (`out/`). A remote agent can `fetch` them with zero protocol overhead.

The Markdown endpoint is useful for keeping an agent-readable mirror of the live resume wherever structured notes live (e.g., an Obsidian vault): an agent with filesystem or MCP write access fetches `/resume.md` and writes the output to a file. The renderer just publishes — the HTTP-to-file side is the consumer's concern.

### Adding a tailored variant (local only)

1. Duplicate `resumes/master.json` → `resumes/<role>.json`. Stays gitignored automatically.
2. Add an entry to `resumeVariants` in `lib/resume-variants.ts`: import the JSON, set `id` / `slug` / `pathname` / `resumeFile` / `templateId` / `themeId`. `generateStaticParams()` picks it up for the static export.
3. Visit `http://localhost:3000/<slug>` to render.

### Adding a new section kind

See the README's "Adding a new section kind" section for the three touchpoints (`lib/schema.ts`, the `accents` map + `switch` in `templates/current/index.tsx`, and matching `--t-current-*` variables in `app/globals.css`). Also extend the switch in `renderSection` inside `lib/resume-markdown.ts` so the new kind serializes in the Markdown endpoint. TypeScript exhaustiveness checking on the discriminated union catches missing cases in both places.

### Changing the active template per route

Templates are resolved per-variant. To try a different template on a route: add a folder under `templates/` exporting `shell` and `Document`, register it in `templates/index.ts`, then set `templateId` on the variant entry in `lib/resume-variants.ts`. If the new template genuinely diverges from the default Markdown outline (uncommon), export a `toMarkdown` alongside `Document` — the `.md` endpoint uses it when present and falls back to `lib/resume-markdown.ts` otherwise.

### Exporting PDF

Open the page in Chrome → `⌘P` → **Margins: None**, **Scale: 100**, **Background graphics: on** → Save as PDF. Print CSS lives in `app/globals.css` and `templates/current/`.

## Architectural principles

- **One schema, many renderers** — web view, print view, and (later) markdown / JSON endpoint / OG image all consume the same typed data. Renderers are composable; variants are not.
- **Variants as whole files** — each variant is a hand-tuned JSON. Duplication is intentional; it buys freedom to trim, reorder, and re-emphasize per role without side effects on other variants.
- **Agent-native** — atomic primitives (read, write, edit files). No workflow tools like `regenerate_tailored_resume`. Judgment stays in prompts.
- **Files as interface** — JSON in the repo is the source of truth. Git history is the resume changelog.

## Guardrails

- Don't break the "edit one JSON → see change" loop. Avoid indirection (state mirrors, generated-from-X layers) that makes agent edits invisible.
- Print layout is a first-class design target, not a de-responsified web view. Tune `@page`, `break-inside`, and typography explicitly.
- Keep templates free of data-shaping logic. If a bullet needs trimming for a variant, edit the variant file.
- Don't commit anything under `resumes/` other than `master.json`. The gitignore enforces this, but don't fight it.

## Commits

The public git history is part of the portfolio — treat it as a curated change log, not a save stream. Group meaningful edits into single commits with descriptive messages. Squash local WIP before pushing. Prefer `Reframe TALtech bullet around UX pain points` over `edit`, `fix`, `more`, `word change`. Twenty thoughtful commits over six months tell a story; two hundred noisy commits feel like jitter.

Never push to `main` without explicit user confirmation. Content edits to `master.json` are public when pushed — double-check phrasing before committing, and ask before pushing if the change was conversational rather than reviewed.
