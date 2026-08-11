# Changelog

Written for an agent porting changes into a downstream copy that has diverged from this repo. Each entry says what changed, which layer it touched, whether it breaks, which files moved, and how to carry the change across.

Layers are **kernel** (the schema contract, the template registry interface, the print pipeline, the representation endpoints — parts other parts trust) and **surface** (templates, section-kind vocabulary, themes, content, conventions — parts you're expected to rewrite). Demo content is its own layer and never breaks a downstream.

Versions are 0.x semver read as severity, not compatibility: a minor bump means at least one breaking kernel change, a patch means everything in the release is additive or surface-only.

## Unreleased

- **Adopter surface** · Not breaking · Ships `wrangler.jsonc`, restores the `deploy` script, and adds a setup prompt to the README that an adopter hands to their own agent. Files: `wrangler.jsonc`, `package.json`, `README.md`, `AGENTS.md`.
- **Adopter surface** · Not breaking · Documents the one-time `workers.dev` subdomain prompt, and keeps the dashboard as the fallback when a custom-domain deploy fails. Files: `README.md`.
- **Adopter surface** · Not breaking · Gives the setup prompt's content step a checkable bound (every claim traces to the user, nothing invented) and adds the one-page fit gate, which the prompt previously left out. Files: `README.md`.
- **Adopter surface** · Not breaking · The setup prompt now handles an adopter who has no host in mind, and the deploy section ranks the alternatives by how much config they need. Files: `README.md`.
- **Kernel** · Not breaking · Adds an opt-in PDF representation. `bun run pdf` serves `out/`, prints every route with headless Chrome, and writes `out/<slug>/resume.pdf`, a deploy artifact in the gitignored `out/` that is never committed. Rendering the PDF pins its printed form to one engine, instead of leaving it to whatever browser a reader prints from. Nothing calls it by default: publishing a PDF costs a Chrome dependency and a deploy that can run it, and the shipped setup path stays a template button and one deploy command. README's "Optional: publish the PDF as a file" carries the three steps to turn it on. Files: `scripts/print-pdf.ts` (new, generic), `scripts/render-pdf.ts` (new, resume-aware), `package.json`, `public/_headers`, `README.md`, `AGENTS.md`.
- **Adopter surface** · Not breaking · Adds a deploy workflow that builds, prints the PDFs, and runs `wrangler deploy`, as a worked example rather than a requirement. It runs manually until an adopter adds the two Cloudflare secrets and uncomments the `push` trigger. Use it instead of a dashboard-connected build, never beside one, because two connected builds race to deploy the same site. Files: `.github/workflows/deploy.yml` (new), `README.md`.
- **Port note** — nothing to port unless you want to publish a PDF. If you do, copy both files in `scripts/` as they are; `print-pdf.ts` has no resume knowledge and needs no adaptation. In `render-pdf.ts`, check the route-to-file mapping against your variants and the expected page size against your `@page` rule. Then follow the three README steps. Chrome must exist wherever you deploy from, so a hosted dashboard build usually cannot do this — its image carries no browser.
- **Port note** — nothing to port unless you want it. If your copy already has host config, keep it and delete `wrangler.jsonc`. If you deploy somewhere other than Cloudflare, translate the two headers in `public/_headers` to that host's mechanism, or your Markdown endpoint loses its UTF-8 charset.

## 0.1.0 — 2026-08-09

Initial release.

- **All layers** · Not breaking · The repo as published: schema-validated resume JSON rendering to a web page, a print-ready PDF, and Markdown and JSON endpoints, with the `baseline` template and the Mira Sedgewick demo content.
- **Port note** — nothing to port. This is the starting point a downstream copies from.
