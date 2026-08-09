// ABOUTME: GET /resume.json — the default variant as validated JSON. Sibling
// data surface to the root HTML page at `/`. Static export, build-time file.

import { getDefaultResumeVariant } from "@/lib/resume-variants";
import { resumeJsonResponse } from "@/lib/resume-responses";

export const dynamic = "force-static";

export function GET() {
  return resumeJsonResponse(getDefaultResumeVariant());
}
