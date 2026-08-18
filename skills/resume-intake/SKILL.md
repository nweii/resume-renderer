---
name: resume-intake
description: Interview-driven intake for the resume renderer. Turns a user's existing material — documents, notes, folders, or nothing but conversation — into schema-valid canonical content for a variant. Use when a user wants to start a resume, import an old one, or fill a new variant with real content.
---

# Resume intake

You are running an intake session. The goal is one variant's canonical content file, filled with the user's real material, passing `bun run cli check`. Work from the repo root of the user's resume-renderer copy.

## Ground rules

- `docs/schema-contract.md` is the authoritative content shape. Read it before writing any content. Do not work from a remembered schema; the contract is generated from the live schema and may differ from what you expect.
- Never invent facts. Dates, titles, organizations, numbers, links: if the user's material does not state it, ask. A blank optional field is better than a guessed value.
- Preserve the user's voice. Draw bullets and summaries from their own wording. Tighten for length, but do not rewrite into generic resume language. When you tighten, show the before and after and let the user accept it.
- Everything traces to the user. Each claim comes from their material or their answer in this session. Use the `source` and `derivedFrom` fields to record where content came from; they are not rendered.

## Steps

### 1. Read the contract

Read `docs/schema-contract.md`. Note the header shape and each section kind: what it is for, which fields are required, which are optional.

### 2. Pick the variant

Ask which variant this content is for. For a new one, run `bun run cli variant create <slug>`; it scaffolds a registered, schema-valid placeholder you will replace. For an existing one, open `resumes/<slug>.json` and confirm with the user whether you are replacing or extending it.

### 3. Gather the material

Ask where their material lives: old resumes, a portfolio, notes, a folder of documents, a LinkedIn export. Read what they point you at. If they have nothing on file, say so is fine — the whole intake can run as conversation.

### 4. Fill the header

Ask for or extract: name, subtitle lines, contact email, links. Confirm the exact strings; names and URLs are easy to mangle.

### 5. Work section kind by section kind

Go through the section kinds from the contract, one at a time. For each kind:

1. Ask whether the user wants a section of this kind, and what its label should read.
2. Pull candidate entries from their material. Show what you found and where it came from.
3. Ask for what is missing: date ranges, organizations, outcomes. One batch of questions per section, not one per field.
4. Draft the entries in the user's wording. Read them back for approval before moving on.

Order the sections the way the user wants them read; the file's order is the render order.

### 6. Validate

Write the content to `resumes/<slug>.json` and run `bun run cli check`. A failure names the file, the path into the JSON, and what is wrong. Fix and rerun. The intake is not done until check passes.

### 7. Offer a working copy

Ask whether the user wants a working copy to edit in their own editor. If yes, follow the "Working copies" section in `AGENTS.md`: honor the declared surface table, default to markdown in `working/<slug>.md`, and record any new preference in the table.

## Finishing

Show the user their resume at the variant's URL under `bun dev`. Remind them that the JSON file is the only source of truth and that a registered variant must be committed.
