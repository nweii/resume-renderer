import type { ReactNode } from "react";
import type {
  EducationSection,
  ExperiencesSection,
  ProjectsSection,
  Resume,
  SkillsSection,
} from "@/lib/schema";

/**
 * Per-section accent colors. Each section kind (skills, projects, experiences,
 * education) gets its own heading / bullet / divider-line triple. Values
 * reference CSS custom properties defined in `app/globals.css` under the
 * `--t-current-*` namespace so light, dark, and print modes can retune the
 * palette without touching this file.
 */
type SectionAccent = { heading: string; bullet: string; line: string };

const accents = {
  skills: {
    heading: "var(--t-current-skills-heading)",
    bullet: "var(--t-current-skills-bullet)",
    line: "var(--t-current-skills-line)",
  },
  projects: {
    heading: "var(--t-current-projects-heading)",
    bullet: "var(--t-current-projects-bullet)",
    line: "var(--t-current-projects-line)",
  },
  experiences: {
    heading: "var(--t-current-experiences-heading)",
    bullet: "var(--t-current-experiences-bullet)",
    line: "var(--t-current-experiences-line)",
  },
  education: {
    heading: "var(--t-current-education-heading)",
    bullet: "var(--t-current-education-bullet)",
    line: "var(--t-current-education-line)",
  },
} satisfies Record<string, SectionAccent>;

/** Outer layout classes applied by the app shell to `<main>` and `<article>`. */
export const shell = {
  mainClassName:
    "bg-(--t-current-backdrop) flex min-h-screen justify-center px-3 py-6 print:block print:bg-white print:p-0 sm:px-6 md:px-8",
  articleClassName:
    "bg-(--t-current-paper) text-body relative min-h-0 w-full max-w-[8.5in] rounded-lg pb-[0.3in] pt-[0.2in] font-sans text-[8.5pt] leading-[1.4] shadow-md [zoom:var(--t-current-scale)] print:min-h-[11in] print:w-[8.5in] print:max-w-[8.5in] print:rounded-none print:shadow-none print:[zoom:1] md:min-h-[11in] md:rounded-none md:pt-[0.35in]",
} as const;

const PAGE_INSET = "px-4 sm:px-6 print:pr-[0.35in] print:pl-[0.25in] md:pr-[0.35in] md:pl-[0.25in]";

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
        className={`grid grid-cols-1 gap-y-2 print:grid-cols-[0.85in_1fr] print:gap-x-[0.3in] print:gap-y-0 md:grid-cols-[0.85in_1fr] md:gap-x-[0.3in] md:gap-y-0 ${PAGE_INSET} pb-[0.2in] pt-[0.2in]`}>
        <div className="text-[8.5pt] font-bold uppercase tracking-[0.05em]" style={{ color: accent.heading }}>
          {label}
        </div>
        <div className="space-y-[0.2in] print:space-y-[0.1in] md:space-y-[0.1in]">{children}</div>
      </div>
    </section>
  );
}

function ResumeHeader({ header }: { header: Resume["header"] }) {
  const linkCls =
    "text-(--t-current-heading-ink) underline-offset-2 decoration-zinc-400/70 hover:underline dark:decoration-zinc-500";

  const contact = (
    <div className="space-y-0.5 font-semibold leading-[1.35]">
      <div className="wrap-break-words">
        <a className={linkCls} href={`mailto:${header.contact.email}`}>
          {header.contact.email}
        </a>
      </div>
      {header.contact.website && (
        <div className="wrap-break-words">
          <a className={linkCls} href={header.contact.website.url} target="_blank" rel="noopener noreferrer">
            {header.contact.website.label}
          </a>
        </div>
      )}
    </div>
  );

  const subtitle = (
    <p className="mt-[5pt] max-w-full font-semibold italic leading-[1.35] print:col-start-2 print:row-start-2 print:mt-0 md:col-start-2 md:row-start-2 md:mt-0 md:max-w-[4.9in]">
      {header.subtitle.map((line, i) => (
        <span key={i}>
          {line}
          {i < header.subtitle.length - 1 && <br />}
        </span>
      ))}
    </p>
  );

  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-[0.3in] gap-y-3 print:grid-cols-[0.85in_1fr_auto] print:grid-rows-[auto_auto] print:gap-y-[5pt] md:grid-cols-[0.85in_1fr_auto] md:grid-rows-[auto_auto] md:gap-y-[5pt] ${PAGE_INSET} pb-[0.16in]`}>
      <div className="hidden print:col-start-1 print:row-span-2 print:row-start-1 print:block md:col-start-1 md:row-span-2 md:row-start-1 md:block" aria-hidden />

      <div className="col-start-1 row-start-1 min-w-0 print:contents md:contents">
        <h1
          className="text-(--t-current-heading-ink) text-[16pt] font-bold leading-[1.1] tracking-[0] print:col-start-2 print:row-start-1 md:col-start-2 md:row-start-1"
          style={{ fontFamily: "var(--font-display)" }}>
          {header.name}
        </h1>
        {subtitle}
      </div>

      {header.monomark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={header.monomark}
          alt={`${header.name} monomark`}
          className="col-start-2 row-start-1 h-[18pt] w-auto shrink-0 justify-self-end dark:invert print:col-start-3 print:row-start-1 print:invert-0 md:col-start-3 md:row-start-1"
        />
      )}

      <div className="col-span-2 row-start-2 w-full min-w-0 print:col-span-1 print:col-start-3 print:row-start-2 print:text-right md:col-span-1 md:col-start-3 md:row-start-2 md:text-right">
        {contact}
      </div>
    </div>
  );
}

function EntryHead({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="text-(--t-current-heading-ink) flex flex-col gap-1 print:flex-row print:items-baseline print:justify-between print:gap-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="font-semibold">{left}</div>
      {right && <div className="shrink-0 whitespace-nowrap font-semibold">{right}</div>}
    </div>
  );
}

function Entry({
  accent,
  left,
  right,
  summary,
  bullets,
}: {
  accent: SectionAccent;
  left: ReactNode;
  right?: ReactNode;
  summary?: string;
  bullets?: string[];
}) {
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
        <Entry
          key={i}
          accent={accent}
          left={renderLeft ? renderLeft(entry) : entry.title}
          right={entry.dateRange}
          summary={entry.summary}
          bullets={entry.bullets}
        />
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
            return (
              <Section<ProjectsSection["entries"][number]>
                key={i}
                label={section.label}
                accent={accents.projects}
                entries={section.entries}
              />
            );
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
            return (
              <Section<EducationSection["entries"][number]>
                key={i}
                label={section.label}
                accent={accents.education}
                entries={section.entries}
              />
            );
        }
      })}
    </>
  );
}
