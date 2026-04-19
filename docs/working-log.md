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
