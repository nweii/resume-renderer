import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML in `out/` for CDN / Cloudflare Workers (static assets).
  output: "export",
  // A `.md` import is its text, so a markdown content file reaches the variant
  // registry the same way a JSON one does. bunfig.toml's `[loader]` table does
  // the same for Bun (tests and the CLI).
  turbopack: {
    rules: { "*.md": { loaders: ["./scripts/text-loader.js"], as: "*.js" } },
  },
};

export default nextConfig;
