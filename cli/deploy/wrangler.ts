// Shared machinery for the `deploy` and `preview` commands: run the static
// build, run wrangler, and turn wrangler's output into structured results —
// including a specific, actionable error when the copy is not authenticated
// with Cloudflare.

import { spawnSync } from "node:child_process";

export type RunResult = {
  ok: boolean;
  output: string;
};

/** `bun run build`, streamed to the terminal so build progress stays visible. */
export function runBuild(): boolean {
  const result = spawnSync("bun", ["run", "build"], { stdio: "inherit" });
  return result.status === 0;
}

/** Run wrangler via bun's package runner, capturing everything it prints. */
export function runWrangler(args: string[]): RunResult {
  const result = spawnSync("bun", ["x", "wrangler", ...args], {
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/**
 * True when wrangler failed for lack of Cloudflare credentials rather than a
 * broken deploy. Wrangler phrases this differently across paths (interactive
 * login prompt, CI token hint, expired OAuth, API auth codes 9106 and 10000,
 * malformed-token codes 6003 and 6111, invalid-token code 6103), so match
 * them all.
 */
export function isAuthFailure(output: string): boolean {
  return /wrangler login|CLOUDFLARE_API_TOKEN|not authenticated|authentication (error|failed)|\[code: (9106|10000|6003|6103|6111)\]|invalid api token|oauth token/i.test(
    output,
  );
}

/** The message an unauthenticated run fails with: what to run, what scope. */
export const AUTH_HELP = [
  "Not authenticated with Cloudflare. Two ways in:",
  "  - Interactive: run `bunx wrangler login` once on this machine, then rerun.",
  "  - Headless/CI: set CLOUDFLARE_API_TOKEN to an API token with the Workers Scripts: Edit permission (the dashboard's \"Edit Cloudflare Workers\" template), plus CLOUDFLARE_ACCOUNT_ID if the token sees more than one account.",
].join("\n");

/** Every URL wrangler printed, deduplicated, in print order. */
export function extractUrls(output: string): string[] {
  const matches = output.match(/https:\/\/[^\s,)]+/g) ?? [];
  return [...new Set(matches)];
}

/**
 * The preview URL from `wrangler versions upload` output. Wrangler labels it
 * "Version Preview URL:"; fall back to the first workers.dev URL printed.
 */
export function extractPreviewUrl(output: string): string | null {
  const labeled = /Version Preview URL:\s*(https:\/\/\S+)/i.exec(output);
  if (labeled) return labeled[1];
  return extractUrls(output).find((url) => url.includes("workers.dev")) ?? null;
}
