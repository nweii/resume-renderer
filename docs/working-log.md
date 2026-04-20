# Working log — resume-renderer

Living source of truth for implementation decisions. Read when starting work; append when finishing a significant block. Any agent or human collaborator should include their signature.

## Entry template

```markdown
## YYYY-MM-DD — Sentence-case summary of what happened

**Agent**: [agent name + model, e.g. Claude Code / Sonnet 4.6, Cursor / GPT-4o, human]
**Scope**: [brief area, e.g. auth, schema, UI, infra]

What was done, decided, or changed. Keep it concise — link to files or commits where details live. Note any open questions or follow-ups.
```

---

## 2026-04-20 — Decoupled print spacing from responsive spacing for Safari preview

**Agent**: Cursor / GPT-5.4
**Scope**: print / UI

Safari print preview was reusing viewport-responsive spacing after the page had been resized, which showed up most obviously in section vertical rhythm. The fix was to stop relying on `md:` classes as implicit print defaults in `templates/current/sections.tsx` and `templates/current/shell.ts`: print now gets its own explicit section stack spacing, entry spacing, bullet spacing, page insets, and top padding. This keeps Chromium behavior unchanged while making print layout deterministic regardless of the last responsive viewport state.

---

## 2026-04-20 — Modular templates: `templates/current/` and `--t-current-*` tokens

**Agent**: Cursor / GPT-5.4
**Scope**: UI / architecture

Extracted the full-page resume presentation from `app/page.tsx` into `templates/current/` (`sections.tsx`, `theme.ts`, `shell.ts`, `CurrentResumeTemplate.tsx`). `app/page.tsx` now only validates `resumes/master.json` and renders the active template from `templates/index.ts` (`activeResumeTemplateId`). Renamed global resume CSS variables to the `--t-current-*` namespace in `app/globals.css` so a future second full template can own a parallel token set; `ResumeScaler` sets `--t-current-scale`. Updated `README.md` and `AGENTS.md` to match.

---

## 2026-04-19 — Scaffolded Next.js app and established project principles

**Agent**: Claude Code / Opus 4.7
**Scope**: setup

Ran `bun create next-app` at `~/Developer/resume-renderer` (Next 16, React 19, Tailwind v4, App Router, TS, no src/, @/* alias). First commit `2b97091` is the stock scaffold; `487db69` adds project context to `AGENTS.md`.

Key architectural decisions locked during planning (see `docs/usage/` for deeper thinking):

- **One schema, many renderers** — web view, print view, and later markdown/JSON/OG all consume the same typed data. Renderers are composable.
- **Variants as whole files** — each `resumes/*.json` is hand-tuned. No shared-atoms + filter system. Duplication is intentional and git handles the history.
- **Agent-native** — atomic primitives only (read/write/edit files). Claude Code as operator for v0; MCP wrapper post-MVP.
- **Rendering pipeline** — browser `⌘P → Save as PDF` for MVP. No Puppeteer. Print layout is a first-class design target, not de-responsified web.

Followup items:
- Port Nathan's existing Pages resume design → React + Tailwind template (waiting on screenshot).
- Draft Zod schema. Open question: schema-first vs. template-first — probably template-first once the design is in hand, schema-infer backwards from what it needs.
- Build `?mode=print` toggle early so print iteration doesn't require opening print preview each time.
- Investigate `@chenglou/pretext` for fit-to-page measurement (deferred past v1).

---

## 2026-04-19 — Built visual template in `app/page.tsx` with hardcoded content

**Agent**: Claude Code / Opus 4.7
**Scope**: UI / template

Translated Nathan's Apple Pages resume into a single-page React + Tailwind template. Content is hardcoded at this stage — the plan is to lock the visual, then infer the Zod schema backward and extract to `resumes/master.json`.

Decisions locked:

- **Local-first fonts** — `@font-face` declarations in `globals.css` use `local()` fallthrough with web-hosted TTFs as backup. Saans (variable, upright + italic blocks to avoid synthetic italic) and SF Pro (variable weight + width axes, `font-stretch: 125%` for the title).
- **Theme colors live in the template, not the JSON** — each section (`skills`, `projects`, `experiences`, `education`) owns a `{ heading, bullet, line }` hex triple. Resume JSON will only tag sections by kind. Applied via inline `style={{...}}` because Tailwind v4's directional border-color utilities (`border-t-{token}`) don't reliably extend custom color tokens.
- **Full-width dividers over page-margin padding** — `px-[0.4in]` lives on inner wrappers so `<section>` borders span the full 8.5in.
- **Print page box** — `@page { size: letter; margin: 0 }` in `globals.css`. Chrome Print dialog needs "Margins: None, Scale: 100" to avoid double-stacking browser margins.
- **Viewport scaling via CSS `zoom`** — article uses `[zoom:min(1,calc((100vw_-_2rem)/816px))]` so the full page stays visible on narrow screens without building a parallel layout. Pinned at 1 for print.
- **Clickable email/URL** — plain anchors; Tailwind v4 preflight inherits color and text-decoration so style is preserved.

Architecture shift decided but **deferred post-MVP**: true responsive web mode as a separate rendering. Nathan wants three modes eventually (`?mode=web` fluid responsive, `?mode=print` fixed 8.5×11, `?mode=zoom` current scale-down behavior), with `⌘P` always rendering the print version regardless of active mode. Also: page size should be configurable per-variant via schema (`page: { size, margin }`, default letter). Current behavior keeps zoom-scale as the only mode — acceptable for MVP since print is the real deliverable.

`agentation` wired into `app/layout.tsx` (dev-only) for visual feedback paste-loop. MCP sync not configured yet.

Followup items:
- Confirm Experiences heading hex `#1E3A8A` (I guessed based on the bullet `#1C4ED8` pattern after Nathan's original list had `#4C1D95` listed twice).
- Confirm the other near-Tailwind-but-off-by-one hex values: `#7D2D12`, `#6E28D9`, `#1C4ED8`.
- Extract hardcoded content to `resumes/master.json` + write `lib/schema.ts` Zod schema.
- Wire `?mode=print` toggle (still open from prior session).
- Post-MVP: true responsive `?mode=web` + configurable page size.

---

## 2026-04-19 — Extracted content to `resumes/master.json` and `lib/schema.ts`

**Agent**: Cursor / Claude Opus 4.7
**Scope**: schema, data

Template-first schema inferred backwards from `app/page.tsx`. Installed `zod@4`. Page now reads `resumes/master.json`, validates with `resumeSchema.safeParse` at render time, and shows a readable error page (red-tinted `<pre>` of `issues`) on schema failure. No visual changes to the template.

**Schema shape** (`lib/schema.ts`):

- `Resume = { header, sections[] }`.
- `header = { name, subtitle: string[], monomark?, contact: { email, website? { url, label } } }`. Subtitle is an array of lines (joined by `<br />` at render). URL/email kept as plain strings for now — no URL validation since `mailto:` and relative paths would fail `z.url()` and the pain isn't worth the cost yet.
- `sections: DiscriminatedUnion<"kind", [skills, projects, experiences, education]>`.
  - `skills`: `{ kind, label, bullets: string[] }`.
  - `projects`: `entries: { title, dateRange?, bullets }[]`.
  - `experiences`: `entries: { title, organization?, dateRange?, summary?, bullets }[]`. When `organization` is present, the template renders `{title} at {organization}` with "at" in `font-normal`; when absent (e.g. VfA fellowship), `title` renders whole. This is a template concern, not a data concern — the JSON stays clean.
  - `education`: `entries: { title, dateRange?, bullets? }[]`. Bullets optional because the Odin Project / Emil Kowalski row has none.
- Optional `source` / `derivedFrom` on every section and entry per AGENTS.md Strata hook. No render logic depends on them.
- Theme colors stay in `app/page.tsx`; JSON only tags sections by `kind`.

**Inline-markup decision**: `**bold**` convention inside plain bullet strings. Parser at render time is one line (`split(/\*\*(.+?)\*\*/g)`, alternate runs → `<strong>`/`<span>`). Arrays of `{ text, bold? }` runs were considered and rejected — every current bullet uses at most a single bold prefix or mid-sentence emphasis, and forcing structured runs would slow down the "edit JSON, see change" loop for zero authoring benefit. If a bullet ever needs italics / links / code, widen the convention (and parser) then. Nesting is explicitly unsupported.

**Validation surface**: `safeParse` at the top of `Home()`. On failure, a red error page dumps `issues` as JSON. This is the agent loop's error path — it shows up on the same URL, no console round-trip needed. Considered `z.prettifyError` but raw `issues` is more actionable for now (path + message + code per issue).

Followup items:
- Same four theme-color hexes still need Nathan's confirmation; unchanged by this work.
- Variant files (`backend-staff.json` etc.) can now be created as copies of `master.json` when needed — same schema, independent tuning.
- Multi-page overflow behavior is unaddressed. Current template hard-clips at `h-[11in] overflow-hidden`; if `master.json` gains enough content to spill, the overflow silently disappears. Not blocking for the MVP deliverable but will bite eventually.
- `?mode=print` toggle still open from prior sessions.
- Consider a tiny `lib/richText.ts` if `renderRichText` grows beyond the current ~5 lines — keeping it inline in `page.tsx` for now since it's template-only concern.

---

## 2026-04-19 — Locked architecture for integration, hosting, privacy, overflow, and commit discipline

**Agent**: Cursor / Claude Opus 4.7
**Scope**: architecture / planning

Long conversation settling several cross-cutting decisions before more implementation. No code yet, just the decision record.

**Portfolio integration: link + additive JSON endpoint, not dual renderer.**
Portfolio (`nathancheng.work`, deployed on Vercel) links to the deployed renderer as the canonical resume page. The portfolio does *not* get its own resume rendering — the existing design on this repo is exactly what Nathan wants everywhere. Additively, the renderer exposes `/resume.json` so programmatic consumers (future Strata, OG image generators, agents) can read the data contract directly. Variants post-MVP would add sibling routes (`/backend-staff`, `/api/backend-staff.json`). Public portfolio links only to the canonical — tailored variants are private (see below).

**Path-based URL via cross-provider rewrite.**
Target URL is `nathancheng.work/resume`, not `resume.nathancheng.work`. Achieved by Vercel `next.config.ts` rewrites on the portfolio proxying `/resume*` to the deployed renderer, paired with `basePath: '/resume'` in the renderer's Next config so asset paths resolve under the rewrite. Implementation deferred until the deploy step.

**Hosting: Cloudflare Workers, static export.**
App is effectively static — `master.json` is imported at build time, no runtime mutation. `next build` with `output: "export"` produces HTML + the JSON file, served from Cloudflare's CDN with zero Worker execution cost. Free tier trivially covers this. Cloudflare Pages is being subsumed into Workers Static Assets, so we deploy directly to Workers. Consolidates with Nathan's existing Cloudflare infrastructure (tunnels, DNS on `nthn.fyi`, Zero Trust auth for `bmcp.nthn.fyi`). One consequence: schema validation failures become build failures (readable in build logs) rather than runtime red error pages — better for the agent loop, worth noting.

**Read API via HTTP; write API deferred to MCP.**
Read surface is plain HTTP — `/resume.json`, later `/resume.pdf`, `/api/schema`, `/api/measure` (once pretext lands server-side). Any client can consume with zero protocol overhead. Writes are *not* REST endpoints: a write-REST-API would duplicate what MCP does better (tool discovery + typed schemas surfaced to the agent without external docs). When remote writes matter, build an MCP server on Lola using the existing `obsidian-remote-mcp` pattern (Cloudflare Zero Trust + OAuth 2.1). For now, writes happen via Claude Code on Mac editing files directly; NTHNbot covers remote-write fallback.

**Overflow: manual eyeballing for now; pretext server-side deferred.**
Pretext (`@chenglou/pretext` v0.0.5) has the right API for measurement but currently requires browser canvas (`measureText`). Its server-side story is "soon" per the npm README. Nathan explicitly prefers to wait rather than hack in a `@napi-rs/canvas` polyfill in bun tests — this is personal use, manual "is it two pages?" eyeballing is fine. When server-side lands, the path is `lib/measure.ts` (pretext for variable-height text, CSS constants for structural heights) shared between `tests/fit.test.ts` (agent signal) and a dev-only on-screen badge (human signal). In the meantime, adding a visible dashed rule at the 11in page boundary so overflow is at least *visible* to the eye — captured in this block's implementation.

**Public master, private variants.**
`resumes/master.json` stays public — canonical for the portfolio link, reference shape for forkers, and its history reads as craft iteration. Variants (`backend-staff.json`, etc.) are gitignored — tailoring-for-specific-role feels more exposed in public history and also makes the targeting machinery more legible than is comfortable. Forkers get `master.json` as the working example; variants are a convention they can adopt locally. For private variant version history, Nathan can use a sibling private repo pattern (his existing `nthnOS-configs` shape) when needed.

**Commit discipline as authoring layer.**
Public repo + public master means the git history is part of the portfolio. Treat commits as a curated change log: group meaningful edits into single commits with descriptive messages, squash local WIP before pushing. Noise commits (`edit`, `fix typo`, `more`) should not land publicly. Added to `AGENTS.md` as a convention so agents working in this repo follow it. Professional optics take: the risk of bad-faith git archaeology exists but is small; the benefit of visible iteration is real and compounds. The framing that closes the loop — the repo is a portfolio of the *system*, not an archive of the resume.

**Scope for the next block**: README pass (including the five fork knobs and section-kind extension recipe), `.gitignore` for variants, AGENTS.md commit-discipline note, and the overflow dashed rule. Static export + Workers deploy is a separate block because it involves deploy config. `/resume.json` route piggybacks on static export.

Followup items:
- `/resume.json` route + static export + Cloudflare Workers deploy (separate block).
- Portfolio-side Vercel rewrites + `basePath: '/resume'` in renderer (after Workers deploy is live).
- Pretext server-side: revisit when `@chenglou/pretext` ships the promised non-canvas path; then build `lib/measure.ts` + `tests/fit.test.ts` + dev-only overflow badge.
- Schema contract tests in `bun test` (assert master validates, section counts, balanced `**bold**` pairs) — cheap guardrail that doesn't need pretext, deferred until a block where we're writing tests anyway.
- MCP server on Lola if/when remote structured writes become friction-worthy.

---

## 2026-04-20 — Replaced scaffold favicon with the portfolio monomark

**Agent**: Cursor / GPT-5.4
**Scope**: branding / metadata

Replaced the default Next scaffold favicon with the same monomark treatment used in `nathancheng.work/Portfolio`: taupe rounded-square background with the white monomark centered inside. The renderer now uses a generated `app/icon.tsx` route instead of a checked-in `.ico`, which keeps the favicon styling configurable in code while letting forks swap the glyph by replacing a single SVG file.

**Implementation details**:

- Added `lib/site.ts` as the central place for site title/description and favicon styling knobs (`background`, `foreground`, `inset`, `borderRadius`).
- Added `app/favicon-mark.svg` by copying the portfolio's `monomark-tiny.svg` so the glyph matches the existing site mark.
- Added `app/icon.tsx` using `next/og` `ImageResponse` and marked it `force-static` for compatibility with `output: "export"`.
- Removed the scaffolded `app/favicon.ico` so browsers get the generated icon rather than the default Next logo.
- During verification, local-asset `fetch(new URL(..., import.meta.url))` failed in this repo's static-export prerender path, so the icon route now reads the SVG from disk with Node APIs at build time instead.

Followup items:

- If/when the renderer gets a public base URL config, consider adding `metadataBase` in `app/layout.tsx` alongside `siteConfig`.
- If you want iOS home-screen parity later, add `app/apple-icon.tsx` that reuses the same styling constants.
