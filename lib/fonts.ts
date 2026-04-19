import localFont from "next/font/local";
import { Funnel_Sans } from "next/font/google";

// Body font: Funnel Sans (Google Fonts). Served via next/font so it's
// self-hosted at build time — no runtime Google Fonts fetch, works with
// static export.
export const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-funnel",
});

// Display font: Nimbus Sans Bold Extended, loaded as three weights from
// local woff2 files. The h1 on the resume uses the 700 weight at natural
// stretch — the face is already extended, no fontStretch needed on the
// element itself.
export const nimbusExt = localFont({
  src: [
    {
      path: "../public/fonts/nsDt Bld Ext.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/nsDt Rg Ext.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/nsDt Lt Ext.woff2",
      weight: "300",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-nimbus",
});
