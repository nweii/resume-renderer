# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), with two additions for the reader this file is written for: an agent porting a change into a downstream copy that has already diverged.

- Every entry is tagged **kernel** or **surface**, and says whether it breaks. Kernel is the schema contract, the template registry interface, the print pipeline, and the representation endpoints — parts other parts trust. Surface is templates, section-kind vocabulary, themes, content, and conventions — parts you are expected to rewrite. Demo content is its own layer and never breaks a downstream.
- Each release ends with **Port**, addressed to that agent. The entries say what changed; the port note says how to carry it across.

Versions are 0.x semver read as severity, not compatibility: a minor bump means at least one breaking kernel change, a patch means everything in the release is additive or surface-only.

## Unreleased

### Added

- **Surface** · Not breaking · Docs only: `VISION.md` states the core idea and the three tenets that govern judgment calls; AGENTS.md points agents at it. `VISION.md`, `AGENTS.md`.
- **Kernel** · Not breaking · An opt-in PDF representation. `bun run pdf` prints every route with headless Chrome into the gitignored `out/`. Nothing calls it by default. `scripts/print-pdf.ts`, `scripts/render-pdf.ts`, `package.json`, `public/_headers`.
- **Surface** · Not breaking · A deploy workflow that builds, prints the PDFs, and runs `wrangler deploy`. Manual until an adopter adds two Cloudflare secrets and uncomments the `push` trigger. `.github/workflows/deploy.yml`.
- **Surface** · Not breaking · `wrangler.jsonc`, the restored `deploy` script, and a setup prompt an adopter hands to their own agent. `wrangler.jsonc`, `package.json`, `README.md`, `AGENTS.md`.

- **Surface** · Not breaking · Docs only: the working-copy editing loop — edit any human-friendly mirror, the agent validates and compiles it into canonical content, `bun dev` previews. `README.md`.
- **Surface** · Not breaking · The working-copy convention: a gitignored `working/` home (one copy per variant, named by slug), a user-editable declaration table in AGENTS.md recording each variant's surface, and agent-facing lifecycle rules — canonical wins on conflict, copies stay regenerable, stale copies get cleaned up. `.gitignore`, `AGENTS.md`, `README.md`.
- **Kernel** · Not breaking · A `resume` CLI on [incur](https://github.com/wevm/incur), with `check` as its first command: every registered variant must parse against the schema. `cli/`, `package.json`, `bun.lock`, `README.md`, `AGENTS.md`.
- **Kernel** · Not breaking · `docs/schema-contract.md`, the agent-facing content contract generated from the Zod schema by `bun run cli contract`. `check` fails while it is stale, so the document agents read and the validator cannot drift apart. `cli/contract/`, `cli/check/contract.ts`, `cli/check/index.ts`, `cli/index.ts`, `docs/schema-contract.md`, `AGENTS.md`.
- **Surface** · Not breaking · `.describe()` prose on the section-kind discriminators and the fields whose meaning is not obvious from the type; the generated contract carries it. `lib/schema.ts`.
- **Kernel** · Not breaking · `update`, the CLI command for a downstream copy: fetch the `upstream` remote, compare its tagged releases against the last-reviewed marker, and print each unreviewed release's changelog section oldest-first for the operating agent to judge and port. It never applies anything, and being behind is never an error. `--reviewed <tag>` records the review in `.upstream-reviewed`, a gitignored per-copy dotfile. `cli/update/`, `cli/index.ts`, `.gitignore`, `AGENTS.md`.
- **Kernel** · Not breaking · A `variant` command group: `variant create <slug>` scaffolds a schema-valid content file, registers it in the variant registry and `.gitignore`, and yields a rendering route; `variant list` reads the registry back. Deletion stays manual and is documented. `cli/variant/`, `cli/index.ts`, `README.md`, `AGENTS.md`.
- **Surface** · Not breaking · `skills/resume-intake/`, the first bundled agent skill: an interview-driven intake that turns a user's material into schema-valid variant content, loading `docs/schema-contract.md` for the shape and finishing only when `check` passes. `skills add` installs it alongside the generated command skills. `skills/resume-intake/SKILL.md`, `cli/index.ts`, `.gitignore`, `README.md`, `AGENTS.md`.
- **Surface** · Not breaking · `check` also enforces the changelog contract — a source-touching change needs an entry under `## Unreleased` or a `no-changelog: <reason>` commit trailer. `cli/check/changelog.ts`, `README.md`, `AGENTS.md`.

- **Kernel** · Not breaking · `setup`, the guided first run from a fresh template copy to a live workers.dev URL. It detects state (auth, Worker name, existing deploy), runs only the missing stages behind confirmation gates — Cloudflare login, writing the Worker name into `wrangler.jsonc` by text anchor, and the first deploy through the same path as `deploy` — and is idempotent: rerunning reports state and repairs what is missing. Every prompt has a flag (`--name`, `--yes`, `--skip-deploy`) for agent-driven use. The custom domain stays out of setup; it remains the documented config edit. `cli/setup/`, `cli/index.ts`, `package.json`, `README.md`, `AGENTS.md`.
- **Kernel** · Not breaking · `deploy` and `preview`, the CLI's publishing commands. `deploy` builds the static export and runs `wrangler deploy` — the explicit production deploy. `preview` builds and runs `wrangler versions upload`, printing the staged version's preview URL while production stays as it was. Both work from a fresh copy given only Cloudflare authentication; an unauthenticated run fails naming the fix (`bunx wrangler login`, or `CLOUDFLARE_API_TOKEN` with Workers Scripts: Edit). The `deploy` npm script now routes through the CLI, and a `preview` script joins it. `cli/deploy/`, `cli/index.ts`, `package.json`, `README.md`, `AGENTS.md`.

- **Kernel** · Not breaking · `doctor`, the CLI's diagnostic command. It checks the stitched-together environment — every variant against the schema, the generated contract's freshness, `wrangler.jsonc`'s validity, Cloudflare auth, whether the configured Worker exists, and upstream staleness — and reports one finding per check, each problem naming its fix. It is read-only everywhere, network checks skip with a note when unreachable, and being behind upstream is information, never a failure: a healthy or merely behind copy exits zero. The auth classifier also learned wrangler's malformed-token error codes (6003, 6103, 6111). `cli/doctor/`, `cli/deploy/wrangler.ts`, `cli/update/index.ts`, `cli/index.ts`, `README.md`, `AGENTS.md`.

- **Kernel** · Not breaking · Markdown as a content format. A variant's content file may be `resumes/<slug>.md` in a small dialect (`docs/markdown-dialect.md`): frontmatter for the header, `##` per section with the kind read from the label or a `<!-- kind: x -->` marker, `###` per entry with an `**organization** · *dateRange*` line, `-` bullets. `parseResumeMarkdown` in `lib/resume-markdown.ts` is the deterministic inverse of `resumeToMarkdown` (parse(toMarkdown(content)) equals content, tested on the demo content), and both read the schema for what each kind holds. `lib/resume-content.ts` reads either format into validated content or into issues stated in the file's terms (JSON path, or line and heading); the page, the data endpoints, and `check` go through it. `.md` imports are text, via `bunfig.toml`, `next.config.ts` with `scripts/text-loader.js`, and `lib/markdown-modules.d.ts`. `variant create --markdown` scaffolds a markdown variant. `lib/resume-markdown.ts`, `lib/resume-content.ts`, `lib/frontmatter.ts`, `lib/markdown-modules.d.ts`, `lib/resume-variants.ts`, `lib/resume-responses.ts`, `app/ResumePage.tsx`, `cli/check/variants.ts`, `cli/variant/`, `cli/contract/generate.ts`, `scripts/text-loader.js`, `next.config.ts`, `bunfig.toml`, `.gitignore`, `docs/markdown-dialect.md`, `docs/schema-contract.md`.

### Changed

- **Kernel** · Breaking · The `.md` representation is now the dialect: it opens with a frontmatter block, and an entry's organization and date sit on the line under its `###` heading as `**organization** · *dateRange*` instead of `### title at organization` and a separate `*dateRange*` line. Anything that parsed the old outline needs the new one. `lib/resume-markdown.ts`.
- **Surface** · Not breaking · Working-copy docs: markdown in the dialect is canonical content, edited in place with no reconciliation; a working copy is for other surfaces. The declared-surfaces table no longer defaults to a markdown mirror. `README.md`, `AGENTS.md`, `CONTEXT.md`, `skills/resume-intake/SKILL.md`.
- **Surface** · Not breaking · The README deploy section leads with `bun run cli preview` and `bun run cli deploy` instead of the raw wrangler invocation. `README.md`.
- **Surface** · Not breaking · The setup prompt now bounds its content step (every claim traces to the adopter, nothing invented), gates on the one-page fit, and handles an adopter with no host in mind. `README.md`.
- **Surface** · Not breaking · Deploy docs cover the one-time `workers.dev` subdomain prompt, rank the host alternatives by how much config each needs, and keep the dashboard as the fallback when a custom-domain deploy fails. `README.md`.
- **Surface** · Not breaking · The baseline template's type and rhythm: body 9.5pt at 1.55 leading (was 9pt at 1.3), name 25pt, section labels 12.5pt in a new accent color over a faded rule, entry titles 11pt, page margins 0.5in top and 0.7in sides. Two new theme tokens, `--t-baseline-accent` and `--t-baseline-rule`, carry the accent; before and after renders are in `docs/baseline-craft-pass/`. `templates/baseline/index.tsx`, `app/globals.css`, `docs/baseline-craft-pass/`.

### Fixed

- **Kernel** · Not breaking · `next build`'s TypeScript pass fails on a fresh copy: `cli/variant/create.ts` used the Bun-only `import.meta.dir`, which that pass rejects; a warm incremental cache hid it. Replaced with a URL-derived path. `cli/variant/create.ts`.

### Port

Markdown content is one module and its plumbing. Copy `lib/resume-markdown.ts` whole (it replaces your Markdown converter; if you added a section kind, add its labels to `sectionKindLabels` and, only if the kind has a field outside title/organization/dateRange/summary/bullets, a notation for it in both `renderEntry` and the parser), plus `lib/frontmatter.ts`, `lib/resume-content.ts`, and `lib/markdown-modules.d.ts`. Route the three readers through `readResume`/`requireResume` as `app/ResumePage.tsx`, `lib/resume-responses.ts`, and `cli/check/variants.ts` do here. Add the `[loader]` table to `bunfig.toml`, the `turbopack.rules` entry to `next.config.ts` with `scripts/text-loader.js` beside it (Turbopack's built-in `raw` module type exports nothing usable as of Next 16.2, hence the four-line loader; a webpack build needs the equivalent `raw-loader` rule instead), and `resumes/*.md` to `.gitignore`. `cli/variant/create.ts` gains a format parameter; port it if you took the CLI. Then regenerate the contract so its intro links the dialect page, and copy `docs/markdown-dialect.md`, editing its label table to match yours.

The breaking part is only the `.md` endpoint's shape. If nothing of yours reads `/resume.md`, there is nothing to migrate; the demo content is unchanged because JSON stays as it was. If a template of yours overrides `toMarkdown`, its output is outside the dialect and does not round-trip; either drop the override or accept that markdown files for that template are hand-written.

Nothing else to port unless you want to publish a PDF. If you do, copy `scripts/` as it is — `print-pdf.ts` has no resume knowledge and needs no adaptation. In `render-pdf.ts`, check the route-to-file mapping against your variants and the expected page size against your `@page` rule. Then follow "Optional: publish the PDF as a file" in the README.

Chrome must exist wherever you deploy from, so a host that rebuilds on push usually cannot do this — its image has no browser. Disconnect that build before enabling the workflow, or both deploy the same push and the one without a PDF can land last, while the workflow reports success. This happened in practice, not in theory.

For the host config: if your copy already has its own, keep it and delete `wrangler.jsonc`. Off Cloudflare, translate the headers in `public/_headers` to that host's mechanism, or your Markdown endpoint loses its UTF-8 charset.

The CLI is new and nothing else calls it, so take it or leave it. To take it, copy `cli/`, the `incur` dependency, and the `check` and `cli` scripts. The bundled skill travels with it: copy `skills/` and the `include` line in `cli/index.ts`, add `.agents/` to your `.gitignore`, and rerun `skills add`. The skill reads your generated `docs/schema-contract.md`, so it needs no adaptation however far your schema has diverged. `cli/check/variants.ts` reads your registry and your schema through the same two modules this repo uses, so it needs no adaptation however far your content has diverged. `cli/doctor/` reads everything through those same modules plus `wrangler.jsonc`, so on Cloudflare it ports as-is; if your copy deleted `wrangler.jsonc` for another host, drop the config, auth, and Worker checks from `cli/doctor/index.ts` or they will call that deletion a problem.

`cli/variant/` edits `lib/resume-variants.ts` and `.gitignore` by text anchors: the last `import ... from "@/resumes/*.json"` line, the closing `} satisfies Record<string, ResumeVariant>;` line, and the `!resumes/default.json` line. If your copies keep those shapes, it ports as-is; if they diverged, update the anchors in `cli/variant/create.ts` — the command refuses to edit a file it does not recognize, so a mismatch fails loudly rather than corrupting the registry.

The contract generator (`cli/contract/`) reads your schema through `lib/schema.ts` like everything else, so it needs no adaptation. After porting any schema change, run `bun run cli contract` and commit `docs/schema-contract.md`, or `check` will name it stale.

`cli/check/changelog.ts` is the part that assumes things about you. Keep it only if your copy still keeps a `CHANGELOG.md` with an `## Unreleased` section, and it is worth keeping only if your copy has downstreams of its own. Its one tunable is `OUTSIDE_CONTRACT`, the paths that never reach a copy. Widen that list rather than loosening the rule: a check that lets silence pass stops being a check.

The baseline template change is a set of numbers, so port it by value rather than by diff: the template's class strings name every size and spacing in points, and the comment above `shell` in `templates/baseline/index.tsx` summarizes the scale. Your theme block needs the two new tokens or the section labels, bullet markers, and contact links render in the fallback color: add `--t-baseline-accent` and `--t-baseline-rule` to both the screen and `@media print` blocks in `app/globals.css` (or whatever namespace your theme uses). The rule is `color-mix()` of the accent at 40% toward transparent; set the accent to your heading color for an all-black document. After porting, open `/` under `bun dev` and confirm your own content still fits one page — the looser leading adds roughly 15% height, and the overflow ruler tells you the moment it spills.

`cli/update/` is written for you, the downstream. It needs the `upstream` remote from the README's setup steps and nothing else; copy it with the rest of `cli/` and add `.upstream-reviewed` to your `.gitignore`. If your copy has no downstreams of its own, the command still earns its keep — it is how you review these very port notes.

Adding `incur` is the first dependency this repo has taken since it was published, which surfaced a trap now written down under "Installs" in `AGENTS.md` — `frozenLockfile = true` blocks `bun add`, and no flag overrides it.

## 0.1.0 — 2026-08-09

### Added

- **All layers** · Not breaking · The repo as published: schema-validated resume JSON rendering to a web page, a print-ready PDF, and Markdown and JSON endpoints, with the `baseline` template and the Mira Sedgewick demo content.

### Port

Nothing to port. This is the starting point a downstream copies from.
