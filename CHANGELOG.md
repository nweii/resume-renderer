# Changelog

Written for an agent porting changes into a downstream copy that has diverged from this repo. Each entry says what changed, which layer it touched, whether it breaks, which files moved, and how to carry the change across.

Layers are **kernel** (the schema contract, the template registry interface, the print pipeline, the representation endpoints — parts other parts trust) and **surface** (templates, section-kind vocabulary, themes, content, conventions — parts you're expected to rewrite). Demo content is its own layer and never breaks a downstream.

Versions are 0.x semver read as severity, not compatibility: a minor bump means at least one breaking kernel change, a patch means everything in the release is additive or surface-only.

## Unreleased

## 0.1.0 — 2026-08-09

Initial release.

- **All layers** · Not breaking · The repo as published: schema-validated resume JSON rendering to a web page, a print-ready PDF, and Markdown and JSON endpoints, with the `baseline` template and the Mira Sedgewick demo content.
- **Port note** — nothing to port. This is the starting point a downstream copies from.
