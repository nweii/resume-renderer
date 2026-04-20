import type { ReactNode } from "react";
import type {
  EducationSection,
  ExperiencesSection,
  ProjectsSection,
  Resume,
  SkillsSection,
} from "@/lib/schema";
import type { SectionAccent } from "./theme";
import { currentSectionAccents } from "./theme";

const PAGE_INSET = "px-4 sm:px-6 print:pr-[0.35in] print:pl-[0.25in] md:pr-[0.35in] md:pl-[0.25in]";

const SECTION_STACK = "space-y-[0.2in] print:space-y-[0.1in] md:space-y-[0.1in]";
const ENTRY_STACK = "space-y-[8pt] print:space-y-[7pt] print:break-inside-avoid md:space-y-[7pt]";

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

function Bullet({ accent, children }: { accent: SectionAccent; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[14px_1fr] items-start gap-x-1.5">
      <span aria-hidden className="select-none pt-[0.1em] text-center text-[7.5pt] leading-[1.4]" style={{ color: accent.bullet }}>
        •
      </span>
      <span className="min-w-0 leading-[1.4]">{children}</span>
    </li>
  );
}

function BulletList({ accent, bullets }: { accent: SectionAccent; bullets: string[] }) {
  return (
    <ul className="space-y-[6pt] print:space-y-[3pt] md:space-y-[3pt]">
      {bullets.map((text, i) => (
        <Bullet key={i} accent={accent}>
          {renderRichText(text)}
        </Bullet>
      ))}
    </ul>
  );
}

function Section({ label, accent, children }: { label: string; accent: SectionAccent; children: ReactNode }) {
  return (
    <section className="border-t-[1.75pt] last:[&>div]:pb-0" style={{ borderTopColor: accent.line }}>
      <div
        className={`grid grid-cols-1 gap-y-2 print:grid-cols-[0.85in_1fr] print:gap-x-[0.3in] print:gap-y-0 md:grid-cols-[0.85in_1fr] md:gap-x-[0.3in] md:gap-y-0 ${PAGE_INSET} pb-[0.2in] pt-[0.2in]`}>
        <div className="text-[8.5pt] font-bold uppercase tracking-[0.05em]" style={{ color: accent.heading }}>
          {label}
        </div>
        <div className={SECTION_STACK}>{children}</div>
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

function SkillsBlock({ section }: { section: SkillsSection }) {
  return (
    <Section label={section.label} accent={currentSectionAccents.skills}>
      <BulletList accent={currentSectionAccents.skills} bullets={section.bullets} />
    </Section>
  );
}

function ProjectsBlock({ section }: { section: ProjectsSection }) {
  const accent = currentSectionAccents.projects;
  return (
    <Section label={section.label} accent={accent}>
      {section.entries.map((entry, i) => (
        <div key={i} className={ENTRY_STACK}>
          <EntryHead left={entry.title} right={entry.dateRange} />
          <BulletList accent={accent} bullets={entry.bullets} />
        </div>
      ))}
    </Section>
  );
}

function ExperiencesBlock({ section }: { section: ExperiencesSection }) {
  const accent = currentSectionAccents.experiences;
  return (
    <Section label={section.label} accent={accent}>
      {section.entries.map((entry, i) => {
        const left = entry.organization ? (
          <>
            {entry.title} <span className="font-normal">at</span> {entry.organization}
          </>
        ) : (
          entry.title
        );
        return (
          <div key={i} className={ENTRY_STACK}>
            <EntryHead left={left} right={entry.dateRange} />
            {entry.summary && <p>{entry.summary}</p>}
            <BulletList accent={accent} bullets={entry.bullets} />
          </div>
        );
      })}
    </Section>
  );
}

function EducationBlock({ section }: { section: EducationSection }) {
  const accent = currentSectionAccents.education;
  return (
    <Section label={section.label} accent={accent}>
      {section.entries.map((entry, i) => (
        <div key={i} className={ENTRY_STACK}>
          <EntryHead left={entry.title} right={entry.dateRange} />
          {entry.bullets && entry.bullets.length > 0 && <BulletList accent={accent} bullets={entry.bullets} />}
        </div>
      ))}
    </Section>
  );
}

export function CurrentResumeDocument({ resume }: { resume: Resume }) {
  return (
    <>
      <ResumeHeader header={resume.header} />
      {resume.sections.map((section, i) => {
        switch (section.kind) {
          case "skills":
            return <SkillsBlock key={i} section={section} />;
          case "projects":
            return <ProjectsBlock key={i} section={section} />;
          case "experiences":
            return <ExperiencesBlock key={i} section={section} />;
          case "education":
            return <EducationBlock key={i} section={section} />;
        }
      })}
    </>
  );
}
