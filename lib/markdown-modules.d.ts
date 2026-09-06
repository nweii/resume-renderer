// Types a `.md` import as its text. Bun loads it that way through the
// `[loader]` table in bunfig.toml; Turbopack through the `*.md` rule in
// next.config.ts. The variant registry imports markdown content files this way.

declare module "*.md" {
  const text: string;
  export default text;
}
