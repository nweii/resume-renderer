// The `deploy` and `preview` commands. `deploy` is the explicit production
// deploy: build the static export, then `wrangler deploy` to the Worker
// `wrangler.jsonc` names. `preview` builds and runs `wrangler versions
// upload`, which stages a version and prints its preview URL without touching
// what production serves. Both work from a fresh copy given only Cloudflare
// authentication, and fail with a specific way in when it is missing.

import type { Cli } from "incur";

import {
  AUTH_HELP,
  extractPreviewUrl,
  extractUrls,
  isAuthFailure,
  runBuild,
  runWrangler,
} from "./wrangler";

type ErrorSink = {
  error: (options: {
    code: string;
    message: string;
    retryable?: boolean;
  }) => never;
};

function buildOrError(c: ErrorSink) {
  if (!runBuild())
    return c.error({
      code: "BUILD_FAILED",
      message:
        "`bun run build` failed, so nothing was uploaded. Fix the build errors printed above and rerun.",
      retryable: true,
    });
}

function wranglerError(
  c: ErrorSink,
  output: string,
  fallback: string,
) {
  if (isAuthFailure(output))
    return c.error({
      code: "NOT_AUTHENTICATED",
      message: AUTH_HELP,
      retryable: true,
    });
  return c.error({
    code: "WRANGLER_FAILED",
    message: `${fallback}\n\n${output.trim()}`,
    retryable: true,
  });
}

export function registerDeploy(cli: Cli.Cli) {
  return cli.command("deploy", {
    description:
      "Deploy to production: build the static export, then `wrangler deploy` to the Worker named in wrangler.jsonc. This changes what the live URL serves.",
    examples: [{ description: "Build and ship the site" }],
    run(c) {
      buildOrError(c);
      const result = runWrangler(["deploy"]);
      if (!result.ok)
        return wranglerError(
          c,
          result.output,
          "`wrangler deploy` failed. Wrangler's output follows; fix what it names and rerun.",
        );
      const urls = extractUrls(result.output).filter(
        (url) => !url.includes("cloudflare.com") && !url.includes("github.com"),
      );
      return {
        deployed: true,
        urls,
        message:
          urls.length > 0
            ? `Deployed. Live at:\n${urls.map((url) => `  ${url}`).join("\n")}`
            : "Deployed. Wrangler printed no URL; check the dashboard for the Worker's address.",
      };
    },
  });
}

export function registerPreview(cli: Cli.Cli) {
  return cli.command("preview", {
    description:
      "Stage a preview without touching production: build the static export, then `wrangler versions upload`, and print the version's preview URL.",
    examples: [{ description: "Get a shareable URL for the current state" }],
    run(c) {
      buildOrError(c);
      const result = runWrangler(["versions", "upload"]);
      if (!result.ok)
        return wranglerError(
          c,
          result.output,
          "`wrangler versions upload` failed. If the Worker has never been deployed, run `resume deploy` once first — a preview needs an existing Worker to attach to. Wrangler's output follows.",
        );
      const previewUrl = extractPreviewUrl(result.output);
      return {
        previewUrl,
        message: previewUrl
          ? `Preview staged at ${previewUrl} — production is unchanged. Deploying it for real is \`resume deploy\`.`
          : `Preview staged, but no preview URL was printed. Enable the workers.dev preview URL for this Worker (dashboard: Settings → Domains & Routes → Preview URLs) and rerun. Wrangler said:\n${result.output.trim()}`,
      };
    },
  });
}
