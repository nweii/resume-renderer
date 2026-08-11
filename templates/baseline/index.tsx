// ABOUTME: Conventional single-column resume template for screen and US-letter print.
// It renders every schema section kind with small, explicit presentation components.

import type { ReactNode } from "react";
import type { Resume, Section as ResumeSection } from "@/lib/schema";

const PAGE_GUTTER = "px-5 sm:px-[0.6in] print:px-[0.6in]";

/**
 * `print:w-[8.5in]` and `print:min-h-[11in]` are load-bearing: the oversized
 * sheet is what corrects WebKit's print scaling. Keep them, and see the WebKit
 * entry under "Things that will bite you" in AGENTS.md before changing print
 * sizing.
 */
export const shell = {
  mainClassName: "flex min-h-screen flex-col items-center bg-(--t-baseline-backdrop) px-3 py-6 print:block print:bg-white print:p-0 sm:px-6 md:px-8",
  articleClassName: `relative min-h-0 w-full max-w-[8.5in] rounded-sm bg-(--t-baseline-paper) py-6 text-[9pt] leading-[1.3] text-(--t-baseline-ink) shadow-md [font-family:var(--t-baseline-font)] [zoom:var(--resume-scale)] sm:py-[0.45in] print:min-h-[11in] print:w-[8.5in] print:max-w-[8.5in] print:rounded-none print:py-[0.42in] print:shadow-none print:[zoom:1] md:min-h-[11in] md:rounded-none`,
} as const;

function renderRichText(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="list-disc space-y-[2.5pt] pl-[14pt]">
      {bullets.map((bullet, index) => (
        <li key={index} className="pl-[1pt] print:break-inside-avoid">
          {renderRichText(bullet)}
        </li>
      ))}
    </ul>
  );
}

function SectionShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={`mt-[10pt] ${PAGE_GUTTER}`}>
      <h2 className="mb-[5pt] text-[11pt] font-bold leading-tight text-(--t-baseline-heading)">{label}</h2>
      {children}
    </section>
  );
}

function EntryHead({ title, organization, dateRange }: { title: string; organization?: string; dateRange?: string }) {
  return (
    <div className="space-y-[1pt]">
      <div className="flex items-baseline justify-between gap-x-4">
        <h3 className="text-[9.5pt] font-bold leading-tight text-(--t-baseline-heading)">{title}</h3>
        {dateRange && <p className="shrink-0 whitespace-nowrap text-[8.5pt]">{dateRange}</p>}
      </div>
      {organization && <p>{organization}</p>}
    </div>
  );
}

function Entry({ title, organization, dateRange, summary, bullets }: { title: string; organization?: string; dateRange?: string; summary?: string; bullets?: string[] }) {
  return (
    <article className="space-y-[2.5pt] print:break-inside-avoid">
      <EntryHead title={title} organization={organization} dateRange={dateRange} />
      {summary && <p>{summary}</p>}
      {bullets && bullets.length > 0 && <BulletList bullets={bullets} />}
    </article>
  );
}

function renderSection(section: ResumeSection, key: number) {
  switch (section.kind) {
    case "skills":
      return (
        <SectionShell key={key} label={section.label}>
          <BulletList bullets={section.bullets} />
        </SectionShell>
      );
    case "projects":
      return (
        <SectionShell key={key} label={section.label}>
          <div className="space-y-[6pt]">
            {section.entries.map((entry, index) => <Entry key={index} {...entry} />)}
          </div>
        </SectionShell>
      );
    case "experiences":
      return (
        <SectionShell key={key} label={section.label}>
          <div className="space-y-[6pt]">
            {section.entries.map((entry, index) => <Entry key={index} {...entry} />)}
          </div>
        </SectionShell>
      );
    case "education":
      return (
        <SectionShell key={key} label={section.label}>
          <div className="space-y-[6pt]">
            {section.entries.map((entry, index) => <Entry key={index} {...entry} />)}
          </div>
        </SectionShell>
      );
  }

  section satisfies never;
}

function ResumeHeader({ header }: { header: Resume["header"] }) {
  return (
    <header className={`${PAGE_GUTTER} text-center`}>
      <h1 className="text-[23pt] font-bold leading-none text-(--t-baseline-heading)">{header.name}</h1>
      <div className="mt-[5pt] text-[9.5pt] leading-[1.3]">
        {header.subtitle.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="mt-[6pt] flex flex-wrap justify-center gap-x-3 gap-y-1 text-[8.5pt]">
        <a href={`mailto:${header.contact.email}`} className="hover:underline">
          {header.contact.email}
        </a>
        {(header.contact.links ?? []).map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {link.label}
          </a>
        ))}
      </div>
    </header>
  );
}

export function Document({ resume }: { resume: Resume }) {
  return (
    <>
      <ResumeHeader header={resume.header} />
      {resume.sections.map(renderSection)}
    </>
  );
}
