# Initial architecture thinking

Captured 2026-04-19, from the planning conversation that preceded the scaffold. The source Thinking note lives in Nathan's vault: `[[Thinking - AI-driven resume renderer architecture 2026-04]]`.

## Why this project exists

The motivating pain is "agent career chat → actually a finished resume draft." The leverage isn't prettier PDFs than Figma could produce. It's iteration velocity: from "apply that framing we just discussed" to a rendered resume in seconds, without leaving the agent loop.

Secondary framing: project as legible portfolio evidence. Nathan accepts that building this sits adjacent to the higher-stakes act of applying for roles — but the tradeoff is acceptable because a well-executed agent-native tool is worth pointing to in its own right.

## The stack fork that didn't happen

Initial instinct was `@json-render/react-pdf` (Vercel's json-render library). Failed the design-control test: it runs on `@react-pdf/renderer`, which is not web React — no real Tailwind, no pseudo-classes, no CSS grid, manual font registration. Nathan's design opinionation makes this a dealbreaker.

Landed on Next.js + Tailwind + Zod instead. The good idea in json-render (schema as AI contract) is portable; react-pdf's constraints aren't worth taking on for this use case.

## Variants: the composability trap

Mid-planning, we spent real time designing a composable variant system — shared bullet atoms tagged by audience, variant files as filter recipes, one-schema-many-renderers applied to content as well as output.

Nathan pushed back sharply and correctly: bullets aren't fixed across variants. He routinely trims or rewrites the same bullet for fit and emphasis per role. A shared-atom system breaks that workflow.

Landed on: one `master.json`, plus hand-tuned whole-file copies per variant. Duplication is a feature. Git gives the history. Agents work fine with static files. The composability that matters is on the output side (web/print/markdown/JSON), not the content side.

## The Strata boundary

The echoes-between-variants problem — "bullet X in backend-staff is a restatement of the claim behind bullet Y in design-lead" — is a real thing Nathan cares about. But it belongs in Strata (his narrative shaping project), not here.

Resume-renderer stays small: JSON in, pixels out. Strata eventually handles narrative provenance and may one day produce `resumes/*.json` files as output. The interface is file-based and minimal. An optional `source` / `derivedFrom` field in the schema leaves a provenance hook for Strata without coupling the projects.

This separation is load-bearing for keeping resume-renderer agent-native. A small primitive with a clear contract is what makes the agent loop tight.

## Open questions carried forward

- **Schema-first or template-first?** Tentative lean toward template-first once Nathan shares a screenshot of his current Pages resume. Tighter schemas come from schema-inferring backwards from a real, opinionated layout.
- **`@chenglou/pretext` for fit-to-page.** Canvas-based multiline measurement, pure arithmetic after a prepare pass. Could power an auto-fit heuristic (measure → trim low-priority bullets → re-measure) and eventually an MCP `measure_fit` tool. Caveat: canvas measurement ≠ Chromium print-pipeline layout, so it's a fast approximation, not the final arbiter. Defer past v1.
- **MCP server.** Post-MVP. Small atomic tools only (`update_section`, `list_templates`, `render_pdf`), never workflow-shaped bundles.
