# Vision

This project renders a designed, recurring document that an AI agent can operate: a resume, published as a website and a print PDF, hosted at a link the user owns.

The core idea, end to end: loose human source → agent compile → strict typed content → registered layout → pixels. The human writes wherever they like. The agent turns that into content that validates. A designed template turns valid content into a page. The strictness lives in one small place — the schema — and everything else offloads to tools the user already has.

Three tenets guide every change:

1. **Super maintainable and coherent.** Prefer less code, fewer concepts, and one obvious place for each thing. A change that adds a concept must earn it.
2. **Improvements flow upstream easily.** When downstream use reveals a need, the fix should be simple to port back — and simple for other copies to adopt through the changelog's port notes.
3. **Primitives stay modular and adjustable at any stage.** Extensible the way shadcn and its registries are: copied code is meant to be read, understood, and rewritten. Nothing here is a black box.

When a judgment call has no written decision, decide in the direction these tenets point.
