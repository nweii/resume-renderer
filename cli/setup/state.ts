// The pure parts of `setup`: reading and writing the Worker name in
// wrangler.jsonc by text anchor, deriving a default name from the repo
// folder, and turning detected facts into the wizard's remaining stages.
// Everything here is testable without Cloudflare.

/** The Worker name wrangler.jsonc ships with; still holding it means fresh copy. */
export const TEMPLATE_NAME = "my-resume";

export const WRANGLER_FILE = "wrangler.jsonc";

/**
 * Cloudflare Worker names: lowercase letters, digits, and hyphens, starting
 * and ending alphanumeric, at most 63 characters (the DNS label limit —
 * the name becomes `<name>.<subdomain>.workers.dev`).
 */
export const WORKER_NAME_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Thrown when wrangler.jsonc no longer matches the shape the edit expects. */
export class DriftError extends Error {}

// The one anchor both the read and the write rely on: the top-level `"name"`
// property line. JSONC allows comments, so this is a text edit, not a
// parse-and-reserialize that would strip them.
const NAME_ANCHOR = /^(\s*)"name"\s*:\s*"([^"]*)"/m;

/** The Worker name currently in wrangler.jsonc source, or a loud drift error. */
export function readWorkerName(source: string): string {
  const match = NAME_ANCHOR.exec(source);
  if (!match) {
    throw new DriftError(
      `${WRANGLER_FILE} has no \`"name": "..."\` line to anchor on. Set the Worker name by hand, then rerun setup.`,
    );
  }
  return match[2];
}

/**
 * Returns wrangler.jsonc source with the Worker name replaced. Pure text
 * transform that preserves every comment; no-ops when the name already
 * matches, throws `DriftError` when the anchor is missing.
 */
export function writeWorkerName(source: string, name: string): string {
  const match = NAME_ANCHOR.exec(source);
  if (!match || match.index === undefined) {
    throw new DriftError(
      `${WRANGLER_FILE} has no \`"name": "..."\` line to anchor on. Set the Worker name by hand, then rerun setup.`,
    );
  }
  if (match[2] === name) return source;
  return (
    source.slice(0, match.index) +
    `${match[1]}"name": "${name}"` +
    source.slice(match.index + match[0].length)
  );
}

/**
 * A valid Worker name derived from a repo folder name: lowercased, runs of
 * anything else collapsed to single hyphens, trimmed to the length limit.
 * Returns null when nothing usable remains (e.g. a non-ASCII folder name).
 */
export function defaultWorkerName(folderName: string): string | null {
  const name = folderName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
  return WORKER_NAME_PATTERN.test(name) ? name : null;
}

/** The facts `setup` detects before deciding what remains to do. */
export type SetupState = {
  /** The Worker name wrangler.jsonc currently holds. */
  workerName: string;
  /** True when a name still needs writing: the template default is in
   * place, or the caller asked for a different name than the file holds. */
  needsName: boolean;
  /** True when wrangler reports working Cloudflare credentials. */
  authenticated: boolean;
  /** True when a Worker with this name already exists on the account. */
  deployed: boolean;
};

/** One wizard stage `setup` still has to run, in order. */
export type Stage = "auth" | "name" | "deploy";

/**
 * The stages left to run given what was detected. A fully set-up copy plans
 * nothing, which is what makes re-running `setup` idempotent: it reports the
 * live state and offers nothing but repair of whatever is missing.
 */
export function planStages(state: SetupState): Stage[] {
  const stages: Stage[] = [];
  if (!state.authenticated) stages.push("auth");
  if (state.needsName) stages.push("name");
  if (!state.deployed) stages.push("deploy");
  return stages;
}
