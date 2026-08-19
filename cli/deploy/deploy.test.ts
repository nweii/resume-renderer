// The parsing that `deploy` and `preview` hang decisions on: recognizing an
// unauthenticated wrangler failure, and pulling URLs out of wrangler output.

import { describe, expect, test } from "bun:test";

import { extractPreviewUrl, extractUrls, isAuthFailure } from "./wrangler";

describe("isAuthFailure", () => {
  test("matches wrangler's login prompt", () => {
    expect(
      isAuthFailure("You must use `wrangler login` before continuing."),
    ).toBe(true);
  });

  test("matches the non-interactive token hint", () => {
    expect(
      isAuthFailure(
        "In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN environment variable",
      ),
    ).toBe(true);
  });

  test("matches the API authentication error code", () => {
    expect(
      isAuthFailure("Authentication error [code: 10000]"),
    ).toBe(true);
  });

  test("matches a rejected API token", () => {
    expect(
      isAuthFailure("Authentication failed (status: 400) [code: 9106]"),
    ).toBe(true);
  });

  test("ignores an ordinary deploy failure", () => {
    expect(
      isAuthFailure("Uploading... X [ERROR] A request to the API failed."),
    ).toBe(false);
  });
});

describe("url extraction", () => {
  test("finds the labeled preview URL", () => {
    const output = [
      "Uploaded my-resume (2.31 sec)",
      "Worker Version ID: 5ac9…",
      "Version Preview URL: https://abc123-my-resume.example.workers.dev",
    ].join("\n");
    expect(extractPreviewUrl(output)).toBe(
      "https://abc123-my-resume.example.workers.dev",
    );
  });

  test("falls back to the first workers.dev URL", () => {
    expect(
      extractPreviewUrl("Deployed to https://my-resume.example.workers.dev"),
    ).toBe("https://my-resume.example.workers.dev");
  });

  test("returns null when nothing was printed", () => {
    expect(extractPreviewUrl("Uploaded. Done.")).toBeNull();
  });

  test("deduplicates deploy URLs in order", () => {
    const output =
      "https://a.workers.dev\nhttps://b.example.com\nhttps://a.workers.dev";
    expect(extractUrls(output)).toEqual([
      "https://a.workers.dev",
      "https://b.example.com",
    ]);
  });
});
