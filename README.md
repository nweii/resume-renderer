# Resume renderer

Typed JSON goes in. A designed resume comes out, as a web page and as a print-ready PDF from the same content. Templates are plain React and Tailwind.

This repo is built for an agent to operate. You edit the JSON, the page reloads, you look at it, and you repeat.

It is a GitHub template repository. Press **Use this template**, and the copy is yours. The copy does not depend on this repo at run time, so you can rewrite any part of it. `CONTEXT.md` defines the words this project uses, such as variant, template, and theme.

This is alpha software. Breaking changes are expected, and `CHANGELOG.md` explains each one.

## Run it

```bash
bun install
bun dev       # http://localhost:3000
bun test
```

Edit `resumes/default.json`. The page reloads as you save.

The content in the repo is a fictional person, Mira Sedgewick. It uses every section kind. Replace it with your own.

## Hand it to your agent

You do not have to do any of the setup yourself. Paste this to an agent that can run commands, such as Claude Code:

```text
Set up this resume site for me: https://github.com/nweii/resume-renderer

1. Read AGENTS.md and CONTEXT.md. Read lib/schema.ts before you touch content.
2. Ask me where to host it. If I already deploy things somewhere, use that.
3. Replace resumes/default.json with my content. Ask me for a resume, or
   interview me until you have enough. Follow the schema exactly.
4. Put my name in lib/site.ts. Match the file names in public/_headers.
5. public/_headers works on Cloudflare and Netlify only. On another host, set
   the same two headers the way that host does it.
6. Build and deploy. My browser opens once to approve the host. Relay any
   prompt the deploy asks me. Then give me the URL.
7. Add this template repo as a remote named upstream. You can then port its
   later changes into my copy.

Ask me first before anything that spends money or needs my login.
```

The agent needs the repo on disk. Press **Use this template**, clone your copy, then paste the prompt.

## Deploy it yourself

The site is a static export. `next.config.ts` sets `output: "export"`, so `bun run build` writes plain HTML, CSS, and JavaScript to `out/`. There is no server, so any static host works.

[`wrangler.jsonc`](wrangler.jsonc) ships for Cloudflare Workers, and it points [static assets](https://developers.cloudflare.com/workers/static-assets/) at `out/`. Change `name` in that file first. It becomes your address.

```bash
bunx wrangler login   # one time on each machine
bun run deploy        # builds, then deploys
```

`wrangler login` opens your browser once, so you can approve the connection. On your first ever Workers deploy, wrangler also asks you to register a `*.workers.dev` subdomain. Answer it once and you never see it again.

You land on a `*.workers.dev` address, with no DNS and no dashboard.

For your own domain, uncomment the `routes` block in `wrangler.jsonc` and deploy again. Cloudflare provisions DNS and the certificate at deploy time. This works when that domain's zone sits on the same Cloudflare account.

If that deploy fails, the zone belongs to another account, or something already serves that hostname. Fix it in the dashboard: open Workers, select your worker, and go to **Domains & Routes**.

On another host, delete `wrangler.jsonc` and point that host at `out/`.

[`public/_headers`](public/_headers) sets the character set and the file name for the data endpoints. Cloudflare and Netlify read this file. On another host, set the same headers the way that host does it. Without them, an en dash in your Markdown endpoint can reach some readers as mojibake.

## Make a PDF

1. Open the page in Chrome.
2. Press `⌘P`.
3. Set **Margins** to **None**, **Scale** to **100**, and turn on **Background graphics**.
4. Save as PDF.

The `@page { size: letter; margin: 0 }` rule in `app/globals.css` sets the page box. If you leave the margins on, Chrome adds its own margins and the layout doubles up.

## The data model

`resumes/default.json` holds the content. The renderer validates it against the Zod schema in `lib/schema.ts`. A schema error gives you a readable page that lists every problem, instead of a half-rendered resume.

The top level looks like this:

```ts
{
  header: { name, subtitle: string[], monomark?, contact: { email, website? } },
  sections: Section[]  // discriminated union on `kind`
}
```

There are four section kinds. Each one has its own entry shape:

- `skills` — `bullets: string[]`
- `projects` — `entries: { title, dateRange?, bullets }[]`
- `experiences` — `entries: { title, organization?, dateRange?, summary?, bullets }[]`
- `education` — `entries: { title, dateRange?, bullets? }[]`

Every section and entry can carry optional `source` and `derivedFrom` fields. Nothing reads them today. They are a place for a future authoring tool to record where content came from.

### Bold text in bullets

A bullet supports one inline convention. `**text**` renders as bold. The template that renders bullets owns the parser. See `renderRichText` in [`templates/baseline/index.tsx`](templates/baseline/index.tsx). Italics, links, and code are not supported. You can widen the convention in your own template.

```json
"**Redesigned the order exception workflow** used by 60 branch coordinators, reducing average resolution time from three days to one."
```

Read `resumes/default.json` for a worked example of every section kind.

## Make it yours

There are four knobs. The rest is framework.

1. **Your content.** Rewrite `resumes/default.json`. The exact shape is in `lib/schema.ts`.
2. **Your identity.** [`lib/site.ts`](lib/site.ts) holds the name, title, description, and favicon colors. Replace `app/favicon-mark.svg` with your own mark. Copy the name into the file names in [`public/_headers`](public/_headers), so a saved file gets a name you recognize.
3. **Your colors.** Each variant names a `themeId` in [`lib/resume-variants.ts`](lib/resume-variants.ts). The page root then gets `data-resume-theme="<id>"`. Add a block with that id in [`app/globals.css`](app/globals.css) and declare CSS custom properties in it. Templates read those properties, so a theme restyles a template without changing it. Two routes can share one template and use different themes.
4. **Your font.** The baseline template reads one property, `--t-baseline-font`. For a system font or a self-hosted font, edit that value in `app/globals.css`. For a Google Font, load it with `next/font/google` in your own `lib/fonts.ts`. Put its CSS variable on `<html>` in `app/layout.tsx`, then point `--t-baseline-font` at that variable. `next/font` copies the font files into the build, so the live page makes no request to Google.

Past these knobs it is ordinary React and Tailwind. Section headers, the grid, print-only elements: all of it is component work in `templates/` and `app/globals.css`. [`app/page.tsx`](app/page.tsx) and [`app/[variant]/page.tsx`](app/[variant]/page.tsx) stay thin. They look up a variant in [`lib/resume-variants.ts`](lib/resume-variants.ts), validate its JSON, and render the template that the variant names.

### Templates

- **`templates/<id>/`** is one folder per layout. It exports `shell` for the outer layout classes and `Document` for the resume body.
- **`templates/index.ts`** maps template ids to those exports. Add a folder, register it here, then point a variant's `templateId` at the new id.

This repo ships one template, `baseline`. It is a plain single-column resume at letter size. It is meant to be read, understood, and replaced. The conventional look is on purpose: a plain template is easier to make your own than an opinionated one.

The agent feedback toolbar (`Agentation` in `app/layout.tsx`) runs in development only. Delete it if you do not want it.

### Variant paths

[`lib/resume-variants.ts`](lib/resume-variants.ts) is the one place that defines public paths. Each entry binds one URL slug to a JSON file, a template id, and a theme id.

- `/` renders the default variant.
- `/default` renders the same content through the path-based mechanism.

To add a route, copy the `default` entry. Point `resume` at another imported JSON file. Then change `slug` and `pathname`, and change `templateId` or `themeId` if you want. The static export finds it through `generateStaticParams()`.

## Add a section kind

All templates and the Markdown converter share the schema. Each one must handle every kind you add. The discriminated union keeps them in step.

1. Add a section variant to the `sectionSchema` union in **`lib/schema.ts`**. Give it a unique `kind` value and its entry shape.
2. Add a `case` to the `Document` switch in each template listed in **[`templates/index.ts`](templates/index.ts)**. Add the section styling that the layout needs.
3. If your themes use per-section properties, declare them in **`app/globals.css`**. Add them to each `[data-resume-theme="…"]` block, and to the block inside `@media print`.
4. Add a `case` to the `renderSection` switch in **`lib/resume-markdown.ts`**, so the kind appears in the `.md` endpoint.

TypeScript reports any switch arm you miss, because it checks the union for completeness.

## Data endpoints

Each variant publishes three representations. An agent or a script can read the resume without parsing HTML.

| URL                                    | Format   | Notes                                                                 |
| -------------------------------------- | -------- | --------------------------------------------------------------------- |
| `/` · `/<slug>`                        | HTML     | The rendered template.                                                |
| `/resume.json` · `/<slug>/resume.json` | JSON     | Validated data, pretty-printed. Parse it against `lib/schema.ts`.     |
| `/resume.md` · `/<slug>/resume.md`     | Markdown | Fixed outline: H1 name · H2 section · H3 entry · `-` bullets.          |

The Markdown converter in [`lib/resume-markdown.ts`](lib/resume-markdown.ts) reads the schema, so a new template gets Markdown without new code. A template can export its own `toMarkdown` in [`templates/index.ts`](templates/index.ts) when its outline is different. The `**bold**` convention is already valid Markdown and passes through unchanged.

`next build` writes all three as static files. They serve straight from the CDN, and nothing runs on a server.

The HTML page points at its two siblings in two ways. The head carries `<link rel="alternate">` tags for JSON and Markdown, through Next's `metadata.alternates.types`. A small "JSON · Markdown · PDF" footer sits under the resume, where the PDF link opens the print dialog. The first is the path that crawlers and agents follow. The second tells a human reader that the page is published in more than one form.

## Variants

A variant is one whole content file. It is bound to a template and a theme, at its own URL.

Files for a specific role, such as `backend-staff.json`, stay untracked. The `resumes/*.json` rule in `.gitignore` keeps drafts off the record. When you register one in `lib/resume-variants.ts`, add a matching un-ignore line and commit the file. The build imports every registered variant, so a fresh clone cannot render without it.

A variant is not a filtered view of the default. Each one is a whole file, tuned by hand. The duplication is on purpose. It lets you cut, reorder, and re-emphasize for one role, and no other variant changes.

## Page fit

The shipped layout targets one page at 8.5 × 11 inches. US letter is the only page geometry today.

In `bun dev`, `app/PageEdge.tsx` measures the article each time it renders. If the content passes the 11-inch boundary, it draws a red dashed rule there and reports how much text sits below it. When the content fits, nothing appears. The production build drops the indicator.

If the content does pass the boundary, Chrome breaks it across two pages. The `print:break-inside-avoid` rule on entry wrappers keeps one entry from splitting across the break.

A fit signal that `bun test` can read is planned, and deferred. [`@chenglou/pretext`](https://www.npmjs.com/package/@chenglou/pretext) is the right tool for it, but its server-side path is not released yet (as of v0.0.5). When it arrives, one `lib/measure.ts` can serve both the development overlay and a test. An agent that edits content can then fail a test instead of looking at a screen.

## Project docs

- `AGENTS.md` — how an agent works in this repo.
- `CONTEXT.md` — the words this project uses.
- `CHANGELOG.md` — what changed in each release, written for an agent that ports a change into a copy.

## Stack

Next.js 16 (App Router, static export), React 19, Tailwind v4, Zod 4, and Bun as the run time and package manager.

## License

MIT. See `LICENSE`.
