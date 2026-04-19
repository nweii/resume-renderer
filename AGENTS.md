<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resume renderer

An agent-operable primitive: one JSON file in, rendered resume out (web page + print-ready PDF via browser print).

## Purpose

Close the loop between "agent chat about Nathan's positioning" and "a resume draft that looks right." The value is iteration velocity — edit JSON, hot-reload, eyeball, repeat — not chat-pane UX. No GUI. Claude Code (or any MCP-enabled client later) is the operator.

## What exists

- `app/` — Next 16 App Router. Pages render resume variants from JSON.
- `resumes/` *(not yet created)* — one JSON file per variant. `master.json` is canonical; other files are hand-tuned copies (e.g. `backend-staff.json`). Variants are independent artifacts, not filtered views of master.
- `templates/` *(not yet created)* — React components consuming the resume schema. Design-opinionated, Tailwind-based.
- `lib/schema.ts` *(not yet created)* — Zod schema. The contract between agent-authored JSON and the renderer.

## What the agent can do

- Read and edit any `resumes/*.json` file. Schema validation surfaces errors on render.
- Add or modify templates in `templates/` as regular React + Tailwind.
- Toggle print layout in-browser via `/resume?mode=print` (planned) — iterate on print design without opening print preview.
- Export PDF via browser `⌘P → Save as PDF`. No automated render pipeline yet.

## Architectural principles

- **One schema, many renderers** — web view, print view, and (later) markdown / JSON endpoint / OG image all consume the same typed data. Renderers are composable; variants are not.
- **Variants as whole files** — each variant is a hand-tuned JSON. Duplication is intentional; it buys freedom to trim, reorder, and re-emphasize per role without side effects on other variants.
- **Agent-native** — atomic primitives (read, write, edit files). No workflow tools like `regenerate_tailored_resume`. Judgment stays in prompts.
- **Files as interface** — JSON in the repo is the source of truth. Git history is the resume changelog.

## Schema hooks for later

- `source` / `derivedFrom` (optional) — provenance breadcrumb for when [[Strata]] grows to author resume JSONs. No logic depends on it today.

## Guardrails

- Don't break the "edit one JSON → see change" loop. Avoid indirection (state mirrors, generated-from-X layers) that makes agent edits invisible.
- Print layout is a first-class design target, not a de-responsified web view. Tune `@page`, `break-inside`, and typography explicitly.
- Keep templates free of data-shaping logic. If a bullet needs trimming for a variant, edit the variant file.
