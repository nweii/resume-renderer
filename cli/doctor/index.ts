// The `doctor` command: diagnose the stitched-together environment — content,
// generated contract, deploy config, Cloudflare auth, the Worker's existence,
// upstream staleness — so an agent can fix a failure without the user
// understanding the services underneath. Every problem names its remedy.
// Network checks skip with a note when offline, being behind upstream is
// information, and doctor itself never changes anything anywhere.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

import type { Cli } from "incur";

import { checkContract, describeContractFailures } from "../check/contract";
import { checkVariants, describeVariantFailures } from "../check/variants";
import { runWrangler } from "../deploy/wrangler";
import {
  compareVersions,
  hasUpstreamRemote,
  parseVersion,
  readMarker,
  UPSTREAM_REMOTE,
  upstreamReleases,
} from "../update";
import {
  checkWranglerConfig,
  classifyDeployments,
  classifyWhoami,
  describeFindings,
  type Finding,
} from "./checks";

const CONFIG_FILE = "wrangler.jsonc";

function variantsFinding(): Finding {
  const report = checkVariants();
  const problems = describeVariantFailures(report);
  if (problems.length > 0)
    return {
      check: "variants",
      status: "problem",
      detail: `${problems.length} validation problem${problems.length === 1 ? "" : "s"}:\n${problems.map((p) => `    ${p}`).join("\n")}`,
      remedy:
        "Edit each named file until it parses against the schema in docs/schema-contract.md, then rerun `bun run check`.",
    };
  return {
    check: "variants",
    status: "ok",
    detail:
      report.checked.length === 1
        ? "The 1 registered variant validates against the schema."
        : `All ${report.checked.length} registered variants validate against the schema.`,
  };
}

function contractFinding(): Finding {
  const report = checkContract();
  const problems = describeContractFailures(report);
  if (problems.length > 0)
    return {
      check: "schema contract",
      status: "problem",
      detail: problems.join("\n"),
      remedy: "Run `bun run cli contract` and commit the regenerated file.",
    };
  return {
    check: "schema contract",
    status: "ok",
    detail: `${report.file} is fresh against lib/schema.ts.`,
  };
}

/** Upstream staleness, reported as information — never a failure. */
function upstreamFinding(): Finding {
  const check = "upstream";
  if (!hasUpstreamRemote())
    return {
      check,
      status: "info",
      detail: `No "${UPSTREAM_REMOTE}" remote, so there is nothing to compare against. Nothing is wrong; add one (git remote add ${UPSTREAM_REMOTE} <url>) to review upstream releases.`,
    };

  const fetch = spawnSync("git", ["fetch", "--tags", UPSTREAM_REMOTE], {
    encoding: "utf8",
  });
  const offline = fetch.status !== 0;

  const marker = readMarker();
  const markerVersion = marker ? parseVersion(marker) : null;
  const unreviewed = upstreamReleases().filter(
    (release) =>
      !markerVersion || compareVersions(release.version, markerVersion) > 0,
  );

  if (offline && unreviewed.length === 0)
    return {
      check,
      status: "skipped",
      detail: `Could not reach "${UPSTREAM_REMOTE}" (offline or unreachable) and nothing previously fetched awaits review. Rerun with a connection.`,
    };

  const staleNote = offline
    ? ` (could not fetch just now; counting the last successful fetch)`
    : "";
  if (unreviewed.length === 0)
    return {
      check,
      status: "ok",
      detail: marker
        ? `Up to date with upstream: nothing new since ${marker}, the last release reviewed.${staleNote}`
        : `Upstream has no releases to review yet.${staleNote}`,
    };

  return {
    check,
    status: "info",
    detail: `${unreviewed.length} release${unreviewed.length === 1 ? "" : "s"} since the last review${marker ? ` (${marker})` : ""}.${staleNote} Not a failure — run \`resume update\` to read and port them.`,
  };
}

export function registerDoctor(cli: Cli.Cli) {
  return cli.command("doctor", {
    description:
      "Diagnose the environment: variants, the generated schema contract, wrangler.jsonc, Cloudflare auth, whether the Worker exists, and upstream staleness. Read-only everywhere; each problem names its fix; network checks skip gracefully offline.",
    examples: [{ description: "Check the whole environment before working" }],
    run(c) {
      const findings: Finding[] = [variantsFinding(), contractFinding()];

      const config = existsSync(CONFIG_FILE)
        ? readFileSync(CONFIG_FILE, "utf8")
        : null;
      const configFinding = checkWranglerConfig(config);
      findings.push(configFinding);

      const auth = classifyWhoami(runWrangler(["whoami"]));
      findings.push(auth);

      // The Worker probe needs credentials and a config to name the Worker;
      // without both its failure would repeat what the findings above already
      // say, so it skips instead.
      if (auth.status === "ok" && configFinding.status === "ok") {
        findings.push(classifyDeployments(runWrangler(["deployments", "list"])));
      } else {
        findings.push({
          check: "deploy reachability",
          status: "skipped",
          detail:
            "Not probed: checking the Worker needs Cloudflare auth and a valid wrangler.jsonc first.",
        });
      }

      findings.push(upstreamFinding());

      const problems = findings.filter(
        (finding) => finding.status === "problem",
      );
      const report = describeFindings(findings);

      // The envelope drops extra fields on error, so the message carries the
      // whole report — problems with their fixes, and the healthy context
      // around them.
      if (problems.length > 0)
        return c.error({
          code: "DOCTOR_FOUND_PROBLEMS",
          message: [
            `${problems.length} problem${problems.length === 1 ? "" : "s"} found:`,
            ...report.map((line) => `  ${line}`),
            "Apply each fix named above, then rerun `resume doctor`.",
          ].join("\n"),
          retryable: true,
        });

      return {
        healthy: true,
        findings,
        message: ["All checks pass.", ...report.map((line) => `  ${line}`)].join(
          "\n",
        ),
      };
    },
  });
}
