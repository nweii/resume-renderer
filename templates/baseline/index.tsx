// ABOUTME: Conventional single-column resume template for screen and US-letter print.
// It renders every schema section kind with small, explicit presentation components.

import type { ReactNode } from "react";
import type { Resume, Section as ResumeSection } from "@/lib/schema";

/**
 * Page margins on the letter sheet: 0.7in at the sides, 0.5in on top (set on
 * the article shell). Narrow screens drop to a small responsive gutter.
 */
const PAGE_GUTTER = "px-5 sm:px-[0.7in] print:px-[0.7in]";

/**
 * `print:w-[8.5in]` and `print:min-h-[11in]` are load-bearing: the oversized
 * sheet is what corrects WebKit's print scaling. Keep them, and see the WebKit
 * entry under "Things that will bite you" in AGENTS.md before changing print
 * sizing.
 *
 * Type scale: body 9.5pt at 1.55 leading, entry titles 11pt, section labels
 * 12.5pt, name 25pt. Vertical rhythm is set in points so screen and print
 * agree.
 */
export const shell = {
  mainClassName: "flex min-h-screen flex-col items-center bg-(--t-baseline-backdrop) px-3 py-6 print:block print:bg-white print:p-0 sm:px-6 md:px-8",
  articleClassName: `relative min-h-0 w-full max-w-[8.5in] rounded-sm bg-(--t-baseline-paper) py-6 text-[9.5pt] leading-[1.55] text-(--t-baseline-ink) shadow-md [font-family:var(--t-baseline-font)] [zoom:var(--resume-scale)] sm:pt-[0.5in] sm:pb-[0.45in] print:min-h-[11in] print:w-[8.5in] print:max-w-[8.5in] print:rounded-none print:pt-[0.5in] print:pb-[0.45in] print:shadow-none print:[zoom:1] md:min-h-[11in] md:rounded-none`,
} as const;

function renderRichText(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-(--t-baseline-heading)">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="list-disc space-y-[1.5pt] pl-[14pt] marker:text-(--t-baseline-accent)">
      {bullets.map((bullet, index) => (
        <li key={index} className="pl-[2pt] print:break-inside-avoid">
          {renderRichText(bullet)}
        </li>
      ))}
    </ul>
  );
}

function SectionShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={`mt-[14pt] ${PAGE_GUTTER}`}>
      <h2 className="mb-[7pt] border-b border-(--t-baseline-rule) pb-[2.5pt] text-[12.5pt] font-bold leading-tight text-(--t-baseline-accent) print:break-after-avoid">
        {label}
      </h2>
      {children}
    </section>
  );
}

function EntryHead({ title, organization, dateRange }: { title: string; organization?: string; dateRange?: string }) {
  return (
    <div className="space-y-[1pt]">
      <div className="flex items-baseline justify-between gap-x-4">
        <h3 className="text-[11pt] font-bold leading-tight text-(--t-baseline-heading)">{title}</h3>
        {dateRange && <p className="shrink-0 whitespace-nowrap tabular-nums">{dateRange}</p>}
      </div>
      {organization && <p>{organization}</p>}
    </div>
  );
}

function Entry({ title, organization, dateRange, summary, bullets }: { title: string; organization?: string; dateRange?: string; summary?: string; bullets?: string[] }) {
  return (
    <article className="space-y-[2pt] print:break-inside-avoid">
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
          <div className="space-y-[8pt]">
            {section.entries.map((entry, index) => <Entry key={index} {...entry} />)}
          </div>
        </SectionShell>
      );
    case "experiences":
      return (
        <SectionShell key={key} label={section.label}>
          <div className="space-y-[8pt]">
            {section.entries.map((entry, index) => <Entry key={index} {...entry} />)}
          </div>
        </SectionShell>
      );
    case "education":
      return (
        <SectionShell key={key} label={section.label}>
          <div className="space-y-[8pt]">
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
      <h1 className="text-[25pt] font-bold leading-none text-(--t-baseline-heading)">{header.name}</h1>
      <div className="mt-[7pt] text-[10pt] leading-[1.4]">
        {header.subtitle.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="mt-[5pt] flex flex-wrap justify-center gap-x-4 gap-y-1 text-[9pt] tabular-nums text-(--t-baseline-accent)">
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
