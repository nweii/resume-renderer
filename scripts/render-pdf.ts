// Prints every resume route in the static export to a PDF beside its `.json` and
// `.md` siblings. Run after `next build`, before deploy.

import { resumeVariants } from "../lib/resume-variants";
import { printStaticSiteToPdf, type PrintTarget } from "./print-pdf";

const OUT_DIR = "out";
const LETTER_POINTS = { width: 612, height: 792 };

// The default variant answers at `/` as well as at its own slug, so it prints twice.
const targets: PrintTarget[] = [
  { route: "/", outFile: "resume.pdf" },
  ...Object.values(resumeVariants).map((variant) => ({
    route: `/${variant.slug}`,
    outFile: `${variant.slug}/resume.pdf`,
  })),
];

const results = await printStaticSiteToPdf({ dir: OUT_DIR, targets });

for (const result of results) {
  const size = result.pageSize;
  const kb = Math.round(result.bytes / 1024);
  console.log(`${result.route} → ${result.path} (${kb} KB, ${size ? `${size.width}x${size.height}pt` : "page size unread"})`);
}

// A wrong page size means the print CSS stopped reaching Chrome, which is invisible
// in the HTML and easy to ship. Fail the deploy instead.
const wrongSize = results.filter(
  (result) => result.pageSize && (result.pageSize.width !== LETTER_POINTS.width || result.pageSize.height !== LETTER_POINTS.height),
);

if (wrongSize.length > 0) {
  console.error(
    `Expected US letter (${LETTER_POINTS.width}x${LETTER_POINTS.height}pt). Got:\n` +
      wrongSize.map((result) => `  ${result.route}: ${result.pageSize?.width}x${result.pageSize?.height}pt`).join("\n"),
  );
  process.exit(1);
}
