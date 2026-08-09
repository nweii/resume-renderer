import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML in `out/` for CDN / Cloudflare Workers (static assets).
  output: "export",
};

export default nextConfig;
