// The `setup` command: the guided first run from a fresh template copy to a
// live site on a workers.dev address. It detects what is already done, then
// runs only the stages that remain — Cloudflare auth, naming the Worker in
// wrangler.jsonc, and the first deploy — with a confirmation gate before
// anything that touches the account. Re-running it on a configured copy
// reports the live state and repairs whatever is missing, nothing more.
//
// Every prompt is also answerable by a flag (`--name`, `--yes`), so an agent
// can drive the whole sequence non-interactively on the user's behalf. A
// custom domain is deliberately not a stage here; it is the one-line config
// edit documented in wrangler.jsonc and README.md, applied after setup.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";

import type { Cli } from "incur";
import { z } from "incur";

import {
  AUTH_HELP,
  extractUrls,
  isAuthFailure,
  runBuild,
  runWrangler,
} from "../deploy/wrangler";
import { classifyDeployments } from "../doctor/checks";
import {
  defaultWorkerName,
  DriftError,
  planStages,
  readWorkerName,
  type SetupState,
  TEMPLATE_NAME,
  WORKER_NAME_PATTERN,
  WRANGLER_FILE,
  writeWorkerName,
} from "./state";

const REPO_ROOT = new URL("../..", import.meta.url).pathname;

/** True when wrangler reports working Cloudflare credentials. `wrangler
 * whoami` exits zero even when logged out, so judge the output, not the
 * status. */
function isAuthenticated(): boolean {
  const result = runWrangler(["whoami"]);
  return result.ok && !/not authenticated/i.test(result.output);
}

/**
 * Whether a Worker with the configured name already exists on the account,
 * judged by `doctor`'s classifier over the same read-only probe it uses:
 * `wrangler deployments list` succeeds only against an existing Worker, and a
 * not-found failure is the "never deployed" signal, not an error.
 */
function isDeployed(): boolean {
  return (
    classifyDeployments(runWrangler(["deployments", "list"])).status === "ok"
  );
}

/** Run `wrangler login` with the terminal attached, so the browser opens and
 * the user can approve the connection. */
function runLogin(): boolean {
  const result = spawnSync("bun", ["x", "wrangler", "login"], {
    stdio: "inherit",
  });
  return result.status === 0;
}

/**
 * Ask a yes/no question on the terminal. Returns null when there is no
 * terminal to ask — the caller then fails naming the flag that answers it,
 * which is how an agent drives setup without a TTY.
 */
async function confirm(question: string): Promise<boolean | null> {
  if (!process.stdin.isTTY) return null;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`${question} [Y/n] `)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

/** Ask for a line of input, offering a default. Null when there is no TTY. */
async function ask(
  question: string,
  fallback: string | null,
): Promise<string | null> {
  if (!process.stdin.isTTY) return null;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = fallback ? ` [${fallback}]` : "";
    const answer = (await rl.question(`${question}${suffix} `)).trim();
    return answer === "" ? fallback : answer;
  } finally {
    rl.close();
  }
}

function stageLine(n: number, total: number, text: string) {
  console.log(`\n[${n}/${total}] ${text}`);
}

export function registerSetup(cli: Cli.Cli) {
  return cli.command("setup", {
    description:
      "Guided first run: from a fresh template copy to a live workers.dev URL. Detects what is already configured and runs only the missing stages — Cloudflare auth, Worker name, first deploy. Idempotent; rerun it any time to check or repair. Every prompt is answerable by a flag for non-interactive use.",
    options: z.object({
      name: z
        .string()
        .optional()
        .describe(
          "The Worker name to write into wrangler.jsonc; it becomes <name>.<subdomain>.workers.dev. Lowercase letters, digits, single hyphens. Defaults to a name derived from the repo folder.",
        ),
      yes: z
        .boolean()
        .optional()
        .describe(
          "Accept every confirmation gate and default without prompting; required for a non-interactive run that reaches the deploy.",
        ),
      skipDeploy: z
        .boolean()
        .optional()
        .describe(
          "Run every stage except the deploy, and report what remains. Useful to stage the config and deploy later with `resume deploy`.",
        ),
    }),
    examples: [
      { description: "Walk through the first run interactively" },
      {
        options: { name: "jane-doe-resume", yes: true },
        description: "Non-interactive setup, as an agent drives it",
      },
      {
        options: { skipDeploy: true },
        description: "Configure everything but leave the deploy for later",
      },
    ],
    async run(c) {
      // Stage 1 of 4 — detect state. Everything after this only runs when
      // its stage is missing, which is what makes a rerun a repair.
      const wranglerPath = join(REPO_ROOT, WRANGLER_FILE);
      if (!existsSync(wranglerPath))
        return c.error({
          code: "NO_WRANGLER_CONFIG",
          message: `${WRANGLER_FILE} is missing. Setup targets Cloudflare Workers through that file; restore it from the template, or deploy to your own host by hand (see "Deploy it yourself" in README.md).`,
        });

      let source = readFileSync(wranglerPath, "utf8");
      let workerName: string;
      try {
        workerName = readWorkerName(source);
      } catch (error) {
        if (error instanceof DriftError)
          return c.error({ code: "CONFIG_DRIFTED", message: error.message });
        throw error;
      }

      if (c.options.name !== undefined && !WORKER_NAME_PATTERN.test(c.options.name))
        return c.error({
          code: "BAD_NAME",
          message: `"${c.options.name}" is not a valid Worker name. Use lowercase letters, digits, and hyphens, starting and ending alphanumeric, at most 63 characters — e.g. jane-doe-resume.`,
          retryable: true,
        });

      stageLine(1, 4, "Detecting state…");
      const authenticated = isAuthenticated();
      const unnamed = workerName === TEMPLATE_NAME;
      // An explicit --name that differs from the file is a rename to apply.
      const needsName =
        unnamed || (c.options.name !== undefined && c.options.name !== workerName);
      const state: SetupState = {
        workerName,
        needsName,
        authenticated,
        // Only judgeable with credentials, and only meaningful when the
        // name is settled — a pending rename means the deploy under the new
        // name has not happened. Without credentials the deploy stage runs
        // anyway, and wrangler settles the question.
        deployed: authenticated && !needsName && isDeployed(),
      };
      const stages = planStages(state);
      console.log(
        [
          `    Worker name: ${workerName}${unnamed ? " (the template default — this copy was never named)" : ""}`,
          `    Cloudflare auth: ${authenticated ? "logged in" : "not logged in"}`,
          `    Worker deployed: ${state.deployed ? "yes" : authenticated ? "no" : "unknown until logged in"}`,
          stages.length === 0
            ? "    Nothing to do — this copy is fully set up."
            : `    Remaining: ${stages.join(", ")}`,
        ].join("\n"),
      );

      if (stages.length === 0)
        return {
          status: "already-set-up",
          workerName,
          message: `Already set up: ${workerName} is named, authenticated, and deployed. Publish changes with \`resume deploy\`; stage a shareable preview with \`resume preview\`. For a custom domain, uncomment the routes block in ${WRANGLER_FILE} and deploy again.`,
        };

      // Stage 2 of 4 — Cloudflare auth.
      if (stages.includes("auth")) {
        stageLine(2, 4, "Cloudflare authentication");
        const go = c.options.yes
          ? true
          : await confirm(
              "Not logged in. Open the browser to log in to Cloudflare?",
            );
        if (go === null)
          return c.error({
            code: "NOT_AUTHENTICATED",
            message: `No terminal to prompt on. ${AUTH_HELP}\nThen rerun setup.`,
            retryable: true,
          });
        if (!go)
          return {
            status: "stopped",
            at: "auth",
            message: `Stopped before login. ${AUTH_HELP}\nThen rerun setup.`,
          };
        if (!process.stdin.isTTY || !runLogin() || !isAuthenticated())
          return c.error({
            code: "NOT_AUTHENTICATED",
            message: `Login did not complete. ${AUTH_HELP}\nThen rerun setup.`,
            retryable: true,
          });
        console.log("    Logged in.");
      } else {
        stageLine(2, 4, "Cloudflare authentication — already logged in.");
      }

      // Stage 3 of 4 — Worker name into wrangler.jsonc.
      if (stages.includes("name")) {
        stageLine(3, 4, "Worker name");
        let name = c.options.name ?? null;
        if (name === null) {
          const fallback = defaultWorkerName(basename(REPO_ROOT));
          name = c.options.yes
            ? fallback
            : await ask(
                "Name this Worker (it becomes <name>.<subdomain>.workers.dev):",
                fallback,
              );
          if (name === null)
            return c.error({
              code: "NAME_REQUIRED",
              message: fallback
                ? `No terminal to prompt on. Pass the Worker name with --name, or --yes to accept the default "${fallback}".`
                : "No terminal to prompt on and no usable default derives from the folder name. Pass the Worker name with --name, e.g. `resume setup --name jane-doe-resume`.",
              retryable: true,
            });
        }
        if (!WORKER_NAME_PATTERN.test(name))
          return c.error({
            code: "BAD_NAME",
            message: `"${name}" is not a valid Worker name. Use lowercase letters, digits, and hyphens, starting and ending alphanumeric, at most 63 characters.`,
            retryable: true,
          });
        source = writeWorkerName(source, name);
        writeFileSync(wranglerPath, source);
        workerName = name;
        console.log(`    Wrote "name": "${name}" to ${WRANGLER_FILE}.`);
      } else {
        stageLine(3, 4, `Worker name — already set: ${workerName}.`);
      }

      // Stage 4 of 4 — first deploy, reusing the same path `resume deploy`
      // takes: build the static export, then `wrangler deploy`.
      stageLine(4, 4, "First deploy");
      if (c.options.skipDeploy || stages.includes("deploy") === false) {
        const reason = c.options.skipDeploy
          ? "Skipped (--skip-deploy)."
          : "Already deployed.";
        return {
          status: c.options.skipDeploy ? "configured" : "already-deployed",
          workerName,
          message: `${reason} ${WRANGLER_FILE} names ${workerName}; publish with \`resume deploy\` whenever you are ready. For a custom domain later, uncomment the routes block in ${WRANGLER_FILE} and deploy again.`,
        };
      }

      const go = c.options.yes
        ? true
        : await confirm(
            `Build and deploy to ${workerName}.<your-subdomain>.workers.dev now?`,
          );
      if (go === null)
        return c.error({
          code: "CONFIRMATION_REQUIRED",
          message:
            "No terminal to prompt on. Pass --yes to confirm the deploy, or --skip-deploy to stop here.",
          retryable: true,
        });
      if (!go)
        return {
          status: "configured",
          workerName,
          message: `Stopped before the deploy. Everything else is set; publish with \`resume deploy\` when ready.`,
        };

      if (!runBuild())
        return c.error({
          code: "BUILD_FAILED",
          message:
            "`bun run build` failed, so nothing was uploaded. Fix the build errors printed above and rerun setup.",
          retryable: true,
        });
      const result = runWrangler(["deploy"]);
      if (!result.ok) {
        if (isAuthFailure(result.output))
          return c.error({
            code: "NOT_AUTHENTICATED",
            message: `${AUTH_HELP}\nThen rerun setup.`,
            retryable: true,
          });
        return c.error({
          code: "WRANGLER_FAILED",
          message: `\`wrangler deploy\` failed. Wrangler's output follows; fix what it names and rerun setup — completed stages are skipped.\n\n${result.output.trim()}`,
          retryable: true,
        });
      }

      const urls = extractUrls(result.output).filter(
        (url) => !url.includes("cloudflare.com") && !url.includes("github.com"),
      );
      return {
        status: "live",
        workerName,
        urls,
        message: [
          urls.length > 0
            ? `Live at:\n${urls.map((url) => `  ${url}`).join("\n")}`
            : "Deployed. Wrangler printed no URL; check the dashboard for the Worker's address.",
          "",
          "From here: `resume deploy` republishes, `resume preview` stages a shareable preview first.",
          `For a custom domain, uncomment the routes block in ${WRANGLER_FILE} and deploy again — a config edit, not a setup step.`,
        ].join("\n"),
      };
    },
  });
}
