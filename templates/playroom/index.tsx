import type { ReactNode } from "react";
import type { EducationSection, ExperiencesSection, ProjectsSection, Resume, SkillsSection } from "@/lib/schema";

/**
 * Per-section accent colors. Each section kind (skills, projects, experiences,
 * education) gets its own heading / bullet / divider-line triple. Values
 * reference CSS custom properties defined in `app/globals.css` under the
 * `--t-playroom-*` namespace so light, dark, and print modes can retune the
 * palette without touching this file.
 */
type SectionAccent = { heading: string; bullet: string; line: string };

const accents = {
  skills: {
    heading: "var(--t-playroom-skills-heading)",
    bullet: "var(--t-playroom-skills-bullet)",
    line: "var(--t-playroom-skills-line)",
  },
  projects: {
    heading: "var(--t-playroom-projects-heading)",
    bullet: "var(--t-playroom-projects-bullet)",
    line: "var(--t-playroom-projects-line)",
  },
  experiences: {
    heading: "var(--t-playroom-experiences-heading)",
    bullet: "var(--t-playroom-experiences-bullet)",
    line: "var(--t-playroom-experiences-line)",
  },
  education: {
    heading: "var(--t-playroom-education-heading)",
    bullet: "var(--t-playroom-education-bullet)",
    line: "var(--t-playroom-education-line)",
  },
} satisfies Record<string, SectionAccent>;

/**
 * Page-edge spacing. `PAGE_GUTTER` is the left/right inset applied to every
 * row that touches the page edge (header + sections). `PAGE_TOP_BOTTOM` lives
 * on the article shell because it's the white sheet's own top/bottom padding,
 * not a property of any internal row. Per-row vertical rhythm is
 * `HEADER_PADDING` / `SECTION_PADDING` below.
 */
const PAGE_GUTTER = "px-4 sm:px-6 print:pr-[0.35in] print:pl-[0.25in] md:pr-[0.25in] md:pl-[0.25in]";
const PAGE_TOP_BOTTOM = "pt-[0.2in] pb-[0.3in] md:pt-[0.25in] md:pb-[0.3in]";

const HEADER_PADDING = "pt-0 pb-[0.15in]";
const SECTION_PADDING = "py-[0.15in] sm:py-[0.15in]";

// Header link list flips from a vertical stack to an inline `·`-separated
// row at the `min-[420px]:` breakpoint below. Tailwind v4's class scanner
// needs literal class strings, so the breakpoint can't be extracted into a
// const and interpolated — search-replace `420px` here if you want to retune.

/** Outer layout classes applied by the app shell to `<main>` and `<article>`. */
export const shell = {
  mainClassName: "bg-(--t-playroom-backdrop) flex min-h-screen justify-center px-3 py-6 print:block print:bg-white print:p-0 sm:px-6 md:px-8",
  articleClassName: `bg-(--t-playroom-paper) text-body relative min-h-0 w-full max-w-[8.5in] rounded-lg font-sans text-[8.5pt] leading-[1.4] shadow-md [zoom:var(--t-playroom-scale)] ${PAGE_TOP_BOTTOM} print:min-h-[11in] print:w-[8.5in] print:max-w-[8.5in] print:rounded-none print:shadow-none print:[zoom:1] md:min-h-[11in] md:rounded-none`,
} as const;

/** Vertical rhythm between entries inside a section. Kept tighter in print/md. */
const ENTRY_STACK = "space-y-[8pt] print:space-y-[7pt] print:break-inside-avoid md:space-y-[7pt]";

/**
 * Bullet text may contain `**bold**` runs authored in the resume JSON. Split on
 * the marker and render odd-indexed fragments as semibold. Keeps the schema
 * content plain-text while letting the template decide how emphasis looks.
 */
function renderRichText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function BulletList({ accent, bullets }: { accent: SectionAccent; bullets: string[] }) {
  return (
    <ul className="space-y-[6pt] print:space-y-[3pt] md:space-y-[3pt]">
      {bullets.map((text, i) => (
        <li key={i} className="grid grid-cols-[14px_1fr] items-start gap-x-1.5">
          <span aria-hidden className="select-none pt-[0.1em] text-center text-[7.5pt] leading-[1.4]" style={{ color: accent.bullet }}>
            •
          </span>
          <span className="min-w-0 leading-[1.4]">{renderRichText(text)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every resume section shares this chrome: a colored divider line on top, a
 * two-column layout with the uppercase label on the left, and content on the
 * right. The `last:[&>div]:pb-0` selector strips bottom padding on the final
 * section so the article ends flush with the accent of the last section.
 */
function SectionShell({ label, accent, children }: { label: string; accent: SectionAccent; children: ReactNode }) {
  return (
    <section className="border-t-[1.75pt] last:[&>div]:pb-0" style={{ borderTopColor: accent.line }}>
      <div
        className={`grid grid-cols-1 gap-y-2 print:grid-cols-[0.85in_1fr] print:gap-x-[0.3in] print:gap-y-0 md:grid-cols-[0.85in_1fr] md:gap-x-[0.3in] md:gap-y-0 ${PAGE_GUTTER} ${SECTION_PADDING}`}>
        <div className="text-[8.5pt] font-bold uppercase tracking-[0.05em]" style={{ color: accent.heading }}>
          {label}
        </div>
        <div className="space-y-[0.2in] print:space-y-[0.1in] md:space-y-[0.1in]">{children}</div>
      </div>
    </section>
  );
}

function ResumeHeader({ header }: { header: Resume["header"] }) {
  const linkCls = "text-(--t-playroom-heading-ink) underline-offset-2 decoration-zinc-400/70 hover:underline dark:decoration-zinc-500";

  const links = [
    <a key="email" className={linkCls} href={`mailto:${header.contact.email}`}>
      {header.contact.email}
    </a>,
    ...(header.contact.links ?? []).map((link, i) => (
      <a key={`link-${i}`} className={linkCls} href={link.url} target="_blank" rel="noopener noreferrer">
        {link.label}
      </a>
    )),
  ];

  return (
    <div className={`grid grid-cols-1 print:grid-cols-[0.85in_1fr] print:gap-x-[0.3in] md:grid-cols-[0.85in_1fr] md:gap-x-[0.3in] ${PAGE_GUTTER} ${HEADER_PADDING}`}>
      <div className="hidden print:block md:block" aria-hidden />
      <div className="flex flex-col gap-y-[4pt]">
        <div className="flex items-start justify-between gap-x-[0.25in]">
          <h1 className="text-(--t-playroom-heading-ink) font-display min-w-0 text-[16pt] font-bold leading-[1.1] tracking-[0]">{header.name}</h1>
          {header.monomark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={header.monomark} alt={`${header.name} monomark`} className="h-[18pt] w-auto shrink-0 dark:invert print:invert-0" />
          )}
        </div>

        <div className="flex flex-col gap-y-[4pt] md:gap-y-[1pt]">
          <p className="font-semibold italic">{header.subtitle.join(" ")}</p>

          <div className="flex flex-col gap-y-0.5 font-semibold print:flex-row print:flex-wrap print:items-baseline print:gap-x-2 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-baseline min-[420px]:gap-x-2">
            {links.map((link, i) => (
              <span key={i} className="inline-flex items-baseline gap-x-2">
                {i > 0 && (
                  <span aria-hidden className="text-experiences-divider hidden print:inline min-[420px]:inline">
                    ·
                  </span>
                )}
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EntryHead({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="text-(--t-playroom-heading-ink) flex flex-col gap-1 print:flex-row print:items-baseline print:justify-between print:gap-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="font-semibold">{left}</div>
      {right && <div className="shrink-0 whitespace-nowrap font-semibold">{right}</div>}
    </div>
  );
}

function Entry({ accent, left, right, summary, bullets }: { accent: SectionAccent; left: ReactNode; right?: ReactNode; summary?: string; bullets?: string[] }) {
  return (
    <div className={ENTRY_STACK}>
      <EntryHead left={left} right={right} />
      {summary && <p>{summary}</p>}
      {bullets && bullets.length > 0 && <BulletList accent={accent} bullets={bullets} />}
    </div>
  );
}

/**
 * Renders an entry-list section (projects, experiences, education). Each entry
 * shape shares `title`, optional `dateRange`, optional `summary`, optional
 * `bullets`; the only section-specific tweak is how the left-hand head renders,
 * which callers pass via `renderLeft` (experiences uses it to glue "title at
 * organization"; others fall back to plain title).
 */
function Section<T extends { title: string; dateRange?: string; summary?: string; bullets?: string[] }>({
  label,
  accent,
  entries,
  renderLeft,
}: {
  label: string;
  accent: SectionAccent;
  entries: T[];
  renderLeft?: (entry: T) => ReactNode;
}) {
  return (
    <SectionShell label={label} accent={accent}>
      {entries.map((entry, i) => (
        <Entry key={i} accent={accent} left={renderLeft ? renderLeft(entry) : entry.title} right={entry.dateRange} summary={entry.summary} bullets={entry.bullets} />
      ))}
    </SectionShell>
  );
}

/** Skills is structurally different: no entries, bullets live on the section. */
function SkillsBlock({ section }: { section: SkillsSection }) {
  return (
    <SectionShell label={section.label} accent={accents.skills}>
      <BulletList accent={accents.skills} bullets={section.bullets} />
    </SectionShell>
  );
}

export function Document({ resume }: { resume: Resume }) {
  return (
    <>
      <ResumeHeader header={resume.header} />
      {resume.sections.map((section, i) => {
        switch (section.kind) {
          case "skills":
            return <SkillsBlock key={i} section={section} />;
          case "projects":
            return <Section<ProjectsSection["entries"][number]> key={i} label={section.label} accent={accents.projects} entries={section.entries} />;
          case "experiences":
            return (
              <Section<ExperiencesSection["entries"][number]>
                key={i}
                label={section.label}
                accent={accents.experiences}
                entries={section.entries}
                renderLeft={(e) =>
                  e.organization ? (
                    <>
                      {e.title} <span className="font-normal">at</span> {e.organization}
                    </>
                  ) : (
                    e.title
                  )
                }
              />
            );
          case "education":
            return <Section<EducationSection["entries"][number]> key={i} label={section.label} accent={accents.education} entries={section.entries} />;
        }
      })}
    </>
  );
}
