import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";
export const runtime = "nodejs";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

async function loadMarkSource() {
  const markPath = fileURLToPath(new URL("./favicon-mark.svg", import.meta.url));
  const source = readFileSync(markPath, "utf8");

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    source.replaceAll("currentColor", siteConfig.favicon.foreground),
  )}`;
}

export default async function Icon() {
  const markSource = await loadMarkSource();

  return new ImageResponse(
    (
      <div
        style={{
          background: siteConfig.favicon.background,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: siteConfig.favicon.inset,
          borderRadius: siteConfig.favicon.borderRadius,
        }}
      >
        <img
          alt=""
          src={markSource}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
