// Renders routes of a built static site to PDF by driving headless Chrome, so a
// document's printed form is pinned to one engine instead of whatever a reader has.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { open, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import type { AddressInfo } from "node:net";

export type PrintTarget = {
  /** Route to print, as it appears in a URL: `/` or `/mirage`. */
  route: string;
  /** Where to write the PDF, relative to `dir`: `resume.pdf` or `mirage/resume.pdf`. */
  outFile: string;
};

export type PrintOptions = {
  /** Directory of built static files. The PDFs are written back into it. */
  dir: string;
  targets: PrintTarget[];
  /** Chrome executable. Defaults to `CHROME_PATH`, then the usual install locations. */
  chromePath?: string;
  /** How long the page may take to settle: fonts, images, layout. */
  settleMs?: number;
  /** How long to wait for a finished PDF before giving up on a route. */
  timeoutMs?: number;
};

export type PrintResult = {
  route: string;
  path: string;
  bytes: number;
  /** Page size in PDF points, when the file declares one legibly. 612x792 is US letter. */
  pageSize?: { width: number; height: number };
};

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function findChrome(explicit?: string): string {
  const candidates = [explicit, process.env.CHROME_PATH, ...CHROME_CANDIDATES].filter(
    (candidate): candidate is string => Boolean(candidate),
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `No Chrome executable found. Looked at:\n  ${candidates.join("\n  ")}\n` +
      `Install Chrome, or set CHROME_PATH to an executable.`,
  );
}

/**
 * Maps a URL path to a file the way a static host does: an exact file, then the
 * same path with `.html`, then a directory's `index.html`.
 */
function resolveStaticFile(dir: string, urlPath: string): string | undefined {
  const relative = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const base = resolve(dir);
  const candidates = relative === ""
    ? [join(base, "index.html")]
    : [join(base, relative), `${join(base, relative)}.html`, join(base, relative, "index.html")];

  for (const candidate of candidates) {
    // Refuse anything outside the served directory, whatever the request said.
    if (!resolve(candidate).startsWith(base)) continue;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }

  return undefined;
}

function serveDirectory(dir: string) {
  const server = createServer((request, response) => {
    const file = resolveStaticFile(dir, request.url ?? "/");

    if (!file) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": MIME_TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });

  return new Promise<{ origin: string; close: () => Promise<void> }>((fulfil, fail) => {
    server.on("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      fulfil({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** A PDF ends with `%%EOF`, so its presence means the writer finished the file. */
async function isCompletePdf(path: string) {
  if (!existsSync(path)) return false;

  const size = statSync(path).size;
  if (size === 0) return false;

  const handle = await open(path, "r");
  try {
    const tail = Buffer.alloc(Math.min(1024, size));
    await handle.read(tail, 0, tail.length, size - tail.length);
    return tail.toString("latin1").includes("%%EOF");
  } finally {
    await handle.close();
  }
}

/**
 * Runs one print and returns once the PDF is complete on disk.
 *
 * Chrome writes the file and then keeps running rather than exiting, so waiting on
 * process exit hangs. Verified on Chrome 151, macOS 27, on a page as small as a
 * single heading. The finished file is the completion signal, and Chrome is stopped
 * once it appears. A version that exits on its own is stopped a moment early, which
 * costs nothing, so this stays correct either way.
 */
async function printOne(chromePath: string, args: string[], outPath: string, timeoutMs: number) {
  await mkdir(dirname(outPath), { recursive: true });
  // A leftover file from a previous run would otherwise read as instant success.
  await rm(outPath, { force: true });

  const child = spawn(chromePath, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  let exited: number | null = null;

  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("close", (code) => {
    exited = code ?? 0;
  });

  try {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await isCompletePdf(outPath)) return;

      if (exited !== null) {
        throw new Error(`Chrome exited ${exited} without writing a PDF.\n${stderr.trim()}`);
      }

      await sleep(100);
    }

    throw new Error(`Chrome wrote no finished PDF within ${timeoutMs}ms.\n${stderr.trim()}`);
  } finally {
    // Chrome answers SIGTERM only when it is ready to, and a leaked browser per
    // deploy is worse than an abrupt one, so escalate on a short fuse.
    child.kill("SIGTERM");
    for (let waited = 0; exited === null && waited < 2000; waited += 100) await sleep(100);
    if (exited === null) child.kill("SIGKILL");
  }
}

/**
 * Reads the first `/MediaBox [x y w h]` in the file. Chrome writes it uncompressed,
 * but a PDF is free not to, so treat a miss as unknown rather than wrong.
 */
async function readPageSize(path: string) {
  const handle = await open(path, "r");
  try {
    const head = Buffer.alloc(64 * 1024);
    const { bytesRead } = await handle.read(head, 0, head.length, 0);
    const match = head
      .subarray(0, bytesRead)
      .toString("latin1")
      .match(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*\]/);

    if (!match) return undefined;
    return { width: Number(match[1]), height: Number(match[2]) };
  } finally {
    await handle.close();
  }
}

/**
 * Serves `dir`, prints each target to PDF, and writes the files back into `dir`.
 * Returns what it wrote so the caller can check the sizes it expects.
 */
export async function printStaticSiteToPdf(options: PrintOptions): Promise<PrintResult[]> {
  const { dir, targets, settleMs = 8000, timeoutMs = 60_000 } = options;
  const chromePath = findChrome(options.chromePath);

  if (!existsSync(dir)) {
    throw new Error(`Nothing to print: ${dir} does not exist. Build the site first.`);
  }

  const server = await serveDirectory(dir);
  const profile = await mkdtemp(join(tmpdir(), "print-pdf-"));
  const results: PrintResult[] = [];

  try {
    for (const target of targets) {
      const outPath = resolve(dir, target.outFile);

      await printOne(
        chromePath,
        [
          "--headless",
          "--disable-gpu",
          "--no-first-run",
          "--no-default-browser-check",
          `--user-data-dir=${profile}`,
          // Lets fonts and layout settle without waiting in real time.
          `--virtual-time-budget=${settleMs}`,
          "--no-pdf-header-footer",
          `--print-to-pdf=${outPath}`,
          `${server.origin}${target.route}`,
        ],
        outPath,
        timeoutMs,
      );

      results.push({
        route: target.route,
        path: outPath,
        bytes: statSync(outPath).size,
        pageSize: await readPageSize(outPath),
      });
    }
  } finally {
    await server.close();
    await rm(profile, { recursive: true, force: true });
  }

  return results;
}
