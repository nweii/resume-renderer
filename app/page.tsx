import type { Metadata } from "next";
import { getDefaultResumeVariant } from "@/lib/resume-variants";
import { ResumePage } from "./ResumePage";

// Advertise the JSON + Markdown siblings so AI agents and crawlers can find
// the machine-readable representations without scraping the rendered HTML.
export const metadata: Metadata = {
  alternates: {
    types: {
      "application/json": "/resume.json",
      "text/markdown": "/resume.md",
    },
  },
};

export default function Home() {
  return <ResumePage variant={getDefaultResumeVariant()} />;
}
