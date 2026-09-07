// Where every command looks for the repo it operates on: the git root of the
// working directory, never the checkout the CLI's own source was loaded from.
// A copy that predates the CLI runs it as `cd <copy> && bun run
// <template>/cli/index.ts ...`, and each command must then read that copy —
// its registry, its schema, its files — not the template's.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** The working directory's git root, or the working directory itself outside git. */
export function repoRoot(): string {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : process.cwd();
}

/** An absolute path to a repo-relative file in the target repo. */
export function repoPath(...segments: string[]): string {
  return join(repoRoot(), ...segments);
}

/**
 * Loads one of the target repo's own modules (its registry, its schema), so
 * a copy that diverged is read by its own code. Bun resolves the module's
 * `@/` imports against that repo's tsconfig, not this one's.
 */
export async function loadRepoModule<T>(relative: string): Promise<T> {
  const path = repoPath(relative);
  if (!existsSync(path))
    throw new Error(
      `${relative} is missing from ${repoRoot()}. Run the CLI from inside a copy of the resume repo (any directory under its git root).`,
    );
  return (await import(path)) as T;
}
