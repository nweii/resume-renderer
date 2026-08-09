// Site-wide identity, consumed by `app/layout.tsx` (metadata) and
// `app/icon.tsx` (generated favicon). Change `name` first — it is the value
// most visible to anyone who lands on the page.
export const siteConfig = {
  name: "Mira Sedgewick",
  title: "Mira Sedgewick — Resume",
  description: "Resume of Mira Sedgewick.",
  favicon: {
    // Fork knobs: update these values and replace `app/favicon-mark.svg`
    // to keep the generated icon aligned with your own branding.
    background: "#403E3C",
    foreground: "#FFFFFF",
    inset: "12%",
    borderRadius: "12%",
  },
} as const;
