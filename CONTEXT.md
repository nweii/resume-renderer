# Resume renderer

A schema-driven document renderer: strict typed JSON in, a designed one-page site and PDF out, operated primarily through an AI agent. This glossary pins the project's language; design rationale lives in the docs, not here.

## Language

### Rendering

**Document type**:
A kind of document (e.g. resume) defined by its own closed schema. The pipeline is document-type-agnostic; this repo ships one.

**Schema**:
The closed, discriminated content contract for a document type. It is the boundary between authoring (loose, agent-mediated) and rendering (strict, refuses anything malformed).
_Avoid_: data model, shape

**Section kind**:
One member of a document type's schema union. Templates dispatch over kinds exhaustively, so a kind a template can't render cannot exist.
_Avoid_: block, slot, component

**Variant**:
One whole content file bound to a template and theme at its own URL slug. Variants are complete documents, not diffs or compositions.
_Avoid_: version, tailored copy

**Template**:
A registered renderer for a document type: page shell, section rendering, and markdown serialization together. Baseline is the default template shipped with the repo.
_Avoid_: layout, skin

**Theme**:
A named set of CSS custom properties that restyles a template without changing it. Templates and themes vary independently.
_Avoid_: palette, style

**Representation**:
One output form of the same variant — rendered page, print PDF, markdown, or JSON. All representations derive from the one content file.
_Avoid_: format, export

**Page geometry**:
The declared size contract a rendered page must fit — physical dimensions for print-first documents. Currently fixed at US letter.
_Avoid_: page size, aspect ratio (a geometry may be expressed as either)

### Content and editing

**Canonical content**:
The variant's JSON file. Every other editing surface is a convenience that reconciles back to it.
_Avoid_: source of truth (say which one), master

**Working copy**:
Any human-friendly mirror of canonical content — markdown, a word processor document, a cloud doc — that the user edits and the agent reconciles into canonical content. The format is the user's choice; nothing in the product assumes one.
_Avoid_: middle surface, mirror file

**Source pool**:
The user's own body of upstream career material (a master CV, a documents folder, notes elsewhere) drawn on during intake and tailoring. The product reads from it through the agent but never manages it.
_Avoid_: master resume, content library

**Intake**:
The agent-led process that turns a user's existing material into schema-valid canonical content.
_Avoid_: import, onboarding (intake is one part of onboarding)

### Product structure

**Kernel**:
The parts an adopter shouldn't rewrite because other parts trust them: the schema contract, the template registry interface, the print pipeline, the representation endpoints. The membership test is the meaning-free rule: kernel code may know that content has a declared shape, never what the content means.

**Adopter surface**:
The parts an adopter is expected to rewrite and own: templates, section-kind vocabulary, themes, content, and their copy of the operating conventions.
_Avoid_: userland

**Upstream**:
This public repo. A user's copied instance is a **downstream**; downstreams never depend on upstream at runtime — they carry their own copy of everything.
_Avoid_: origin, parent repo

**Update**:
The agent-driven act of reviewing upstream changes and porting the wanted ones into a downstream's owned copy.
_Avoid_: sync (implies bidirectional or automatic), upgrade (implies versioned dependency)
