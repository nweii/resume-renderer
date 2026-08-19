// The pure judgments behind `doctor`: what a finding is, and how each piece
// of evidence (a config file's text, wrangler's output) becomes one. Nothing
// here touches the filesystem or the network — the command does that and
// hands the results in, so every classification is testable on its own.

import { AUTH_HELP, isAuthFailure } from "../deploy/wrangler";

/**
 * One diagnosis. `problem` is the only status that fails the run; `skipped`
 * marks a network-dependent check that could not run (offline, say) and
 * `info` carries state worth knowing that nothing needs to fix.
 */
export type Finding = {
  check: string;
  status: "ok" | "problem" | "info" | "skipped";
  detail: string;
  /** Present on every problem: the specific action that clears it. */
  remedy?: string;
};

/** Strip JSONC comments and trailing commas so JSON.parse can read the rest. */
export function parseJsonc(text: string): unknown {
  const bare = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(bare);
}

/** The deploy config is valid when it parses and names a Worker and an assets directory. */
export function checkWranglerConfig(text: string | null): Finding {
  const check = "wrangler config";
  if (text === null)
    return {
      check,
      status: "problem",
      detail: "wrangler.jsonc is missing, so deploy and preview have no Worker to target.",
      remedy:
        "Restore wrangler.jsonc from the upstream template: a `name`, a `compatibility_date`, and an `assets.directory` of \"./out\".",
    };

  let config: unknown;
  try {
    config = parseJsonc(text);
  } catch (error) {
    return {
      check,
      status: "problem",
      detail: `wrangler.jsonc does not parse: ${error instanceof Error ? error.message : String(error)}`,
      remedy: "Fix the syntax error in wrangler.jsonc; it must be valid JSONC.",
    };
  }

  const record = (config ?? {}) as Record<string, unknown>;
  const name = record.name;
  if (typeof name !== "string" || name.trim().length === 0)
    return {
      check,
      status: "problem",
      detail: "wrangler.jsonc has no `name`, so wrangler cannot address a Worker.",
      remedy:
        "Add a `name` to wrangler.jsonc. It becomes the address: <name>.<your-subdomain>.workers.dev.",
    };

  const assets = record.assets as Record<string, unknown> | undefined;
  if (typeof assets?.directory !== "string")
    return {
      check,
      status: "problem",
      detail:
        "wrangler.jsonc has no `assets.directory`, so a deploy would upload nothing.",
      remedy:
        'Add `"assets": { "directory": "./out" }` to wrangler.jsonc — `out/` is where `bun run build` writes the static export.',
    };

  return {
    check,
    status: "ok",
    detail: `wrangler.jsonc targets Worker "${name}" with assets from ${assets.directory}.`,
  };
}

/**
 * True when wrangler's failure reads as a network problem rather than
 * something wrong with this copy — the cue to skip, not fail.
 */
export function isNetworkFailure(output: string): boolean {
  return /ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|network|getaddrinfo|socket hang up|timed?\s?out/i.test(
    output,
  );
}

/** Classify `wrangler whoami`: authenticated, unauthenticated, or unreachable. */
export function classifyWhoami(result: { ok: boolean; output: string }): Finding {
  const check = "cloudflare auth";
  if (result.ok) {
    const account = /associated with the email (\S+?)\.?(?:\s|$)/i.exec(
      result.output,
    );
    return {
      check,
      status: "ok",
      detail: account
        ? `Authenticated with Cloudflare as ${account[1]}.`
        : "Authenticated with Cloudflare.",
    };
  }
  if (isAuthFailure(result.output))
    return {
      check,
      status: "problem",
      detail: "Not authenticated with Cloudflare, so deploy and preview will fail.",
      remedy: AUTH_HELP,
    };
  if (isNetworkFailure(result.output))
    return {
      check,
      status: "skipped",
      detail:
        "Could not reach Cloudflare to check authentication (offline or unreachable). Not a failure; rerun with a connection.",
    };
  return {
    check,
    status: "skipped",
    detail: `\`wrangler whoami\` failed for a reason other than auth; auth state unknown. Wrangler said:\n${result.output.trim()}`,
  };
}

/**
 * Classify `wrangler deployments list`, the read-only probe for whether the
 * configured Worker exists and the deploy path is reachable.
 */
export function classifyDeployments(result: {
  ok: boolean;
  output: string;
}): Finding {
  const check = "deploy reachability";
  if (result.ok)
    return {
      check,
      status: "ok",
      detail: "The configured Worker exists on Cloudflare; deploys have somewhere to land.",
    };
  if (/does not exist|not found|\[code: 10007\]/i.test(result.output))
    return {
      check,
      status: "info",
      detail:
        "The configured Worker has never been deployed. Nothing is broken — `resume deploy` creates it on first run.",
    };
  if (isAuthFailure(result.output))
    return {
      check,
      status: "problem",
      detail: "Cloudflare rejected the credentials while listing deployments.",
      remedy: AUTH_HELP,
    };
  if (isNetworkFailure(result.output))
    return {
      check,
      status: "skipped",
      detail:
        "Could not reach Cloudflare to check the Worker (offline or unreachable). Not a failure; rerun with a connection.",
    };
  return {
    check,
    status: "skipped",
    detail: `Could not determine the Worker's state. Wrangler said:\n${result.output.trim()}`,
  };
}

/** One report line per finding, status first, remedy attached to problems. */
export function describeFindings(findings: Finding[]): string[] {
  return findings.map((finding) => {
    const base = `[${finding.status}] ${finding.check}: ${finding.detail}`;
    return finding.remedy ? `${base}\n    Fix: ${finding.remedy}` : base;
  });
}
