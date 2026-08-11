# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), with two additions for the reader this file is written for: an agent porting a change into a downstream copy that has already diverged.

- Every entry is tagged **kernel** or **surface**, and says whether it breaks. Kernel is the schema contract, the template registry interface, the print pipeline, and the representation endpoints — parts other parts trust. Surface is templates, section-kind vocabulary, themes, content, and conventions — parts you are expected to rewrite. Demo content is its own layer and never breaks a downstream.
- Each release ends with **Port**, addressed to that agent. The entries say what changed; the port note says how to carry it across.

Versions are 0.x semver read as severity, not compatibility: a minor bump means at least one breaking kernel change, a patch means everything in the release is additive or surface-only.

## Unreleased

### Added

- **Kernel** · Not breaking · An opt-in PDF representation. `bun run pdf` prints every route with headless Chrome into the gitignored `out/`. Nothing calls it by default. `scripts/print-pdf.ts`, `scripts/render-pdf.ts`, `package.json`, `public/_headers`.
- **Surface** · Not breaking · A deploy workflow that builds, prints the PDFs, and runs `wrangler deploy`. Manual until an adopter adds two Cloudflare secrets and uncomments the `push` trigger. `.github/workflows/deploy.yml`.
- **Surface** · Not breaking · `wrangler.jsonc`, the restored `deploy` script, and a setup prompt an adopter hands to their own agent. `wrangler.jsonc`, `package.json`, `README.md`, `AGENTS.md`.

### Changed

- **Surface** · Not breaking · The setup prompt now bounds its content step (every claim traces to the adopter, nothing invented), gates on the one-page fit, and handles an adopter with no host in mind. `README.md`.
- **Surface** · Not breaking · Deploy docs cover the one-time `workers.dev` subdomain prompt, rank the host alternatives by how much config each needs, and keep the dashboard as the fallback when a custom-domain deploy fails. `README.md`.

### Port

Nothing to port unless you want to publish a PDF. If you do, copy `scripts/` as it is — `print-pdf.ts` has no resume knowledge and needs no adaptation. In `render-pdf.ts`, check the route-to-file mapping against your variants and the expected page size against your `@page` rule. Then follow "Optional: publish the PDF as a file" in the README.

Chrome must exist wherever you deploy from, so a host that rebuilds on push usually cannot do this — its image has no browser. Disconnect that build before enabling the workflow, or both deploy the same push and the one without a PDF can land last, while the workflow reports success. This happened in practice, not in theory.

For the host config: if your copy already has its own, keep it and delete `wrangler.jsonc`. Off Cloudflare, translate the headers in `public/_headers` to that host's mechanism, or your Markdown endpoint loses its UTF-8 charset.

## 0.1.0 — 2026-08-09

### Added

- **All layers** · Not breaking · The repo as published: schema-validated resume JSON rendering to a web page, a print-ready PDF, and Markdown and JSON endpoints, with the `baseline` template and the Mira Sedgewick demo content.

### Port

Nothing to port. This is the starting point a downstream copies from.
