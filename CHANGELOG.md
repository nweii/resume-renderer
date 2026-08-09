# Changelog

Written for an agent porting changes into a downstream copy that has diverged from this repo. Each entry says what changed, which layer it touched, whether it breaks, which files moved, and how to carry the change across.

Layers are **kernel** (the schema contract, the template registry interface, the print pipeline, the representation endpoints — parts other parts trust) and **surface** (templates, section-kind vocabulary, themes, content, conventions — parts you're expected to rewrite). Demo content is its own layer and never breaks a downstream.

Versions are 0.x semver read as severity, not compatibility: a minor bump means at least one breaking kernel change, a patch means everything in the release is additive or surface-only.

## Unreleased

- **Adopter surface** · Not breaking · Ships `wrangler.jsonc`, restores the `deploy` script, and adds a setup prompt to the README that an adopter hands to their own agent. Files: `wrangler.jsonc`, `package.json`, `README.md`, `AGENTS.md`.
- **Adopter surface** · Not breaking · Documents the one-time `workers.dev` subdomain prompt, and keeps the dashboard as the fallback when a custom-domain deploy fails. Files: `README.md`.
- **Adopter surface** · Not breaking · Gives the setup prompt's content step a checkable bound (every claim traces to the user, nothing invented) and adds the one-page fit gate, which the prompt previously left out. Files: `README.md`.
- **Adopter surface** · Not breaking · The setup prompt now handles an adopter who has no host in mind, and the deploy section ranks the alternatives by how much config they need. Files: `README.md`.
- **Port note** — nothing to port unless you want it. If your copy already has host config, keep it and delete `wrangler.jsonc`. If you deploy somewhere other than Cloudflare, translate the two headers in `public/_headers` to that host's mechanism, or your Markdown endpoint loses its UTF-8 charset.

## 0.1.0 — 2026-08-09

Initial release.

- **All layers** · Not breaking · The repo as published: schema-validated resume JSON rendering to a web page, a print-ready PDF, and Markdown and JSON endpoints, with the `baseline` template and the Mira Sedgewick demo content.
- **Port note** — nothing to port. This is the starting point a downstream copies from.
