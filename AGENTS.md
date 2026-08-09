<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Resume renderer

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
- `lib/schema.ts` — the Zod schema. This is the contract between agent-written JSON and the renderer.
- `lib/resume-variants.ts` — the one place that defines public URL paths.
- `lib/resume-markdown.ts` — the schema-driven Markdown converter behind the `.md` endpoints. A template overrides it with `toMarkdown` only when its outline differs.
- `lib/resume-responses.ts` — turns a variant into a JSON or Markdown `Response`. The four route handlers stay one line each.
- `templates/` — one folder per template, registered in `templates/index.ts`. A variant selects its template. `templates/baseline/` is the one that ships.
- `app/globals.css` — the Tailwind layer and the `--t-baseline-*` properties. `data-resume-theme` on the page root selects the values.

No deploy command ships here. The host is the adopter's choice, and `README.md` covers the static-export options.

## Things that will bite you

- A registered variant must be tracked in git. `.gitignore` keeps `resumes/*.json` untracked, and the build imports every registered variant. Register one, and add its un-ignore line in the same change, or a fresh clone fails to build.
- The schema error page is the feedback surface. A validation failure renders the raw `issues` array with a path and a message per problem. Read that page instead of adding logging.
- Print layout is a design target of its own. Tune `@page`, `break-inside`, and type explicitly. A printed page is not a narrow web page.
- Templates hold no data-shaping logic. If a bullet runs long for one variant, edit that variant's file.
- `**text**` is the only inline convention in a bullet. `renderRichText` in `templates/baseline/index.tsx` owns the parser.

## Write the changelog entry in the same commit

`CHANGELOG.md` is the contract with downstreams. Its reader is an agent porting your change into a copy that already diverged from this one.

Write the entry under `## Unreleased` in the commit that makes the change, while you still hold the intent. An entry written later goes vague.

Each entry carries what changed, kernel or surface, breaking or not, the files touched, and a port note addressed to that porting agent. Some changes genuinely warrant no entry: comment-only edits, test-only changes, refactors invisible from a downstream. Say that explicitly in the commit rather than staying silent.

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

A security patch sometimes lands inside the 3-day window and you need it now. Add that package to `minimumReleaseAgeExclude`. Run `bun install`. Then revert the exclude in the same diff. The git history of the override is the audit trail.

`package.json` gates lifecycle scripts for `sharp` and `unrs-resolver` with `ignoreScripts` and `trustedDependencies`. Leave those two lists alone.
