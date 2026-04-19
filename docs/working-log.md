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
