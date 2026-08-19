<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resume renderer

Read `VISION.md` before making judgment calls — it holds the tenets that decide questions no written decision covers.

Typed JSON in, a rendered resume out: a web page and a print-ready PDF. There is no GUI. An agent is the operator.

`README.md` covers how to run, deploy, and extend the repo. `CONTEXT.md` defines the terms used here: variant, template, theme, representation, kernel, adopter surface, upstream, downstream.

## This is the upstream template

Someone who presses "Use this template" gets a **downstream**: their own copy, with their own content, templates, and host. A downstream carries its own copy of everything and never depends on this repo at run time. Changes travel one way, by an agent reading a port note in `CHANGELOG.md` and applying it to code that has already diverged.

Two consequences shape every change here:

- Keep this repo person-neutral. The content in `resumes/default.json` is demo content, and a fictional person owns it. No real person's history, no brand fonts, no host credentials, no deploy config.
- Write for a reader who replaces you. The `baseline` template exists to be read, understood, and rewritten. Clear beats clever.

## The kernel test

Code here is either **kernel** or **adopter surface**. The test is one rule: kernel code can know *that* content has a declared shape. It can never know *what the content means*.

The registry knows that templates exist and are addressable. That is kernel. The schema validator knows that a schema was declared. That is kernel. Anything that knows a resume has experience before education, or that a bullet reads better short, knows what the content means. That is adopter surface.

Apply the test before you place new code. State out loud what the code knows. If that sentence names a fact about resumes, it belongs in a template, a theme, or the content.

## Repo map

- `app/` — Next 16 App Router. `page.tsx` renders the default variant. `[variant]/page.tsx` exports the configured slugs. Both hand off to `app/ResumePage.tsx`, which validates the JSON and renders a template.
- `lib/schema.ts` — the Zod schema. This is the contract between agent-written JSON and the renderer. `docs/schema-contract.md` is its generated, agent-facing statement — the authoritative content contract to read before writing resume JSON. Regenerate it with `bun run cli contract` after any schema change; `check` fails while it is stale.
- `lib/resume-variants.ts` — the one place that defines public URL paths.
- `lib/resume-markdown.ts` — the schema-driven Markdown converter behind the `.md` endpoints. A template overrides it with `toMarkdown` only when its outline differs.
- `lib/resume-responses.ts` — turns a variant into a JSON or Markdown `Response`. The four route handlers stay one line each.
- `templates/` — one folder per template, registered in `templates/index.ts`. A variant selects its template. `templates/baseline/` is the one that ships.
- `app/globals.css` — the Tailwind layer and the `--t-baseline-*` properties. `data-resume-theme` on the page root selects the values.
- `cli/` — the `resume` CLI, built on [incur](https://github.com/wevm/incur). `index.ts` mounts commands; each command is a folder that exports a `register` function, so one that grows subcommands becomes its own group without touching the root. `check/` validates registered variants against the schema, enforces the changelog contract, and fails when `docs/schema-contract.md` is stale. `contract/` regenerates that document from the schema. `update/` is for downstream copies: it fetches the `upstream` remote and prints the changelog section of every release not yet reviewed, oldest first, for the operating agent to judge and port — it never applies anything. `--reviewed <tag>` records the review (adopted or declined) in `.upstream-reviewed`, a gitignored per-copy dotfile; an absent file means no release was ever reviewed. Being behind upstream is information, not an error, so every `update` path exits zero. `variant/` manages the document collection: `variant create <slug>` scaffolds a registered, rendering variant, and `variant list` reads the registry back; deletion is manual (see "Variants" in README.md). `deploy/` holds the two publishing commands: `deploy` builds and runs `wrangler deploy` — the explicit production deploy — and `preview` builds and runs `wrangler versions upload`, printing the staged version's preview URL without changing what production serves. An unauthenticated run of either fails naming the way in (`wrangler login`, or `CLOUDFLARE_API_TOKEN` with Workers Scripts: Edit). `doctor/` diagnoses the whole environment read-only — variants, contract freshness, `wrangler.jsonc`, Cloudflare auth, the Worker's existence, upstream staleness — with a named fix per problem; network checks skip with a note when offline, and being behind upstream is information, exit zero. Run it with `bun run check`, or `bun run cli <command>`.
- `skills/` — bundled agent skills, one folder per skill holding a `SKILL.md`. `bun run cli skills add` installs them alongside the command skills incur generates (wired by `sync.include` in `cli/index.ts`). `resume-intake` is the intake interview: it loads `docs/schema-contract.md` as the content shape, works section kind by section kind, asks the user for missing facts instead of inventing them, and finishes only when `check` passes.
- `scripts/` — build tooling outside Next, and opt-in. `print-pdf.ts` serves a directory and prints routes with headless Chrome, knowing nothing about resumes. `render-pdf.ts` names the resume routes and rejects any PDF that comes back a size other than US letter, which catches a broken print stylesheet before it deploys.

`bun run pdf` writes `out/<slug>/resume.pdf`. Nothing calls it, and nothing should: publishing a PDF needs Chrome and a deploy that can run it, and the setup path here is a template button and one deploy command. Adopters who want it follow "Optional: publish the PDF as a file" in the README.

`wrangler.jsonc` ships as a working Cloudflare Workers config for the static export, and `bun run cli deploy` (aliased as `bun run deploy`) builds and deploys it; `bun run cli preview` stages a preview URL first. Cloudflare is the path with the fewest steps, not a requirement. On another host, delete that file and serve `out/`. `README.md` carries the setup prompt an adopter hands to their own agent.

## Things that will bite you

- A registered variant must be tracked in git. `.gitignore` keeps `resumes/*.json` untracked, and the build imports every registered variant. Register one, and add its un-ignore line in the same change, or a fresh clone fails to build.
- The schema error page is the feedback surface. A validation failure renders the raw `issues` array with a path and a message per problem. Read that page instead of adding logging.
- Print layout is a design target of its own. Tune `@page`, `break-inside`, and type explicitly. A printed page is not a narrow web page.
- WebKit prints 16/15 (~6.7%) larger than Blink, uniformly across every CSS unit and font size, so no choice of unit avoids it. The fixed print sheet in `templates/baseline/index.tsx` is load-bearing against this: `print:w-[8.5in]` and `print:min-h-[11in]` overflow WebKit's enlarged page, which triggers shrink-to-fit at 0.9375 and cancels the enlargement exactly. Keep both — page-relative sizing (`print:w-full`) removes the overflow, and with it the correction, printing 6.7% large across two pages in Safari. Safari's print preview shows the sheet small and floating, sometimes without the header, while the exported PDF is correct, so judge print changes from the PDF. Verified 2026-08-11, Safari vs Chrome on macOS 27; re-check by printing a page of known lengths (a `4in` bar, a `384px` bar, `24pt` text) from both and comparing `MediaBox` and text span sizes.
- Chrome writes a PDF and then keeps running instead of exiting, so `scripts/print-pdf.ts` waits for a file ending in `%%EOF` and stops the browser itself. Waiting on process exit hangs forever. Verified on Chrome 151, macOS 27, on a page as small as one heading.
- Templates hold no data-shaping logic. If a bullet runs long for one variant, edit that variant's file.
- `**text**` is the only inline convention in a bullet. `renderRichText` in `templates/baseline/index.tsx` owns the parser.

## Working copies

A working copy is a human-friendly mirror of a variant's canonical content — the editing loop in the README's "Edit through a working copy" section. This section is the standing convention for where those copies live and how you manage them.

### Declared surfaces

The table below is user-editable. It records the user's chosen surface per variant. Read it at the start of any editing-loop work and honor it; when the user states a new preference, update the table for them. `mirror` means the copy persists between sessions and you keep it reconciled; `regenerated` means you write a fresh copy from canonical content when asked and may discard it after reconciling.

| Variant slug | Format | Location | Mirror or regenerated |
| --- | --- | --- | --- |
| `default` | markdown | `working/default.md` | mirror |
| _(slug)_ | _(markdown, docx, cloud doc, …)_ | _(path or doc link)_ | _(mirror / regenerated)_ |

The first row is the shipped example; it is also the default for any variant with no row of its own. Replace or extend it as the user declares preferences.

### Lifecycle rules

- **Canonical content wins on conflict.** When a working copy and the variant's JSON disagree and you cannot tell which edit is newer, regenerate the working copy from the JSON and tell the user what you replaced. Never guess the JSON into agreement with a stale copy.
- **A working copy is always regenerable.** Never treat one as the only record of anything. If content exists only in a working copy, reconcile it into canonical content before doing anything else with it.
- **Clean up stale and orphaned copies.** When a variant is deleted, delete its working copy. When the user switches a variant's format or location, update the table and remove the copy at the old surface. Do not leave abandoned copies behind.
- **Nothing outside the declared home.** In-repo working copies live in `working/`, named by variant slug. Do not write mirrors, drafts, or scratch conversions of variant content anywhere else in the repo. A copy outside the repo exists only where the table declares it.

## Write the changelog entry in the same commit

`CHANGELOG.md` is the contract with downstreams. Its reader is an agent porting your change into a copy that already diverged from this one.

Write the entry under `## Unreleased` in the commit that makes the change, while you still hold the intent. An entry written later goes vague.

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — its `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security` groupings, under a version heading — plus two things that standard has no slot for. Tag each entry kernel or surface and say whether it breaks. Close each release with a `### Port` section written to the porting agent.

Keep an entry to one line: what changed, and the files. Rationale and instructions go in the port note, which is where that reader is looking for them. An entry that grows into a paragraph is doing the port note's job.

Some changes warrant no entry: comment-only edits, test-only changes, refactors invisible from a downstream. Say that explicitly with a `no-changelog: <reason>` trailer on the commit, rather than staying silent. `bun run check` reads that trailer and fails a source-touching change that carries neither it nor an entry.

A release is an annotated tag on `main`. Read the version off the unreleased section: one breaking kernel entry makes it a minor bump, and everything else is a patch. A breaking release also migrates the demo content, so the port note has a worked example beside it.

A new section kind is always a kernel change. It moves the schema, so every downstream's templates need a new case.

## Commits

This history is part of what the repo teaches. Group related edits into one commit and describe it. `Stack entry headers so role and organization read separately` beats `edit` or `fix`. Squash local work-in-progress before you push.

Ask before you push to `main`.

## Installs

`bunfig.toml` gates installs. Keep it.

- A package version younger than 3 days is not eligible. This defends against a malicious publish, as in the May 2026 npm incident and its family.
- `frozenLockfile = true`. Commit `bun.lock`.
- `exact = true`. `bun add <pkg>` writes the version with no caret.

`frozenLockfile` also blocks `bun add`, and no flag or environment variable overrides a `bunfig.toml` setting. To add a package: set it to `false`, run `bun add`, set it back, and run `bun install` to confirm the lockfile is now frozen-clean. Restore it in the same diff, the way the release-age override works.

A security patch sometimes lands inside the 3-day window and you need it now. Add that package to `minimumReleaseAgeExclude`. Run `bun install`. Then revert the exclude in the same diff. The git history of the override is the audit trail.

`package.json` gates lifecycle scripts for `sharp` and `unrs-resolver` with `ignoreScripts` and `trustedDependencies`. Leave those two lists alone.
