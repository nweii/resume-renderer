import master from "@/resumes/master.json";
import { resumeSchema, type EducationSection, type ExperiencesSection, type ProjectsSection, type Resume, type SkillsSection } from "@/lib/schema";
import { PageEdge } from "./PageEdge";
import { ResumeScaler } from "./ResumeScaler";

type Theme = {
  heading: string;
  bullet: string;
  line: string;
};

// Section accent colors: CSS variables in `app/globals.css` (light, dark via
// `prefers-color-scheme`, print overrides). Inline `style` only for border and
// bullet dots — values are `var(--theme-…)`.
// Colors come from CSS variables in `app/globals.css` (light / dark / print).
const themes = {
  skills: {
    heading: "var(--theme-skills-heading)",
    bullet: "var(--theme-skills-bullet)",
    line: "var(--theme-skills-line)",
  },
  projects: {
    heading: "var(--theme-projects-heading)",
    bullet: "var(--theme-projects-bullet)",
    line: "var(--theme-projects-line)",
  },
  experiences: {
    heading: "var(--theme-experiences-heading)",
    bullet: "var(--theme-experiences-bullet)",
    line: "var(--theme-experiences-line)",
  },
  education: {
    heading: "var(--theme-education-heading)",
    bullet: "var(--theme-education-bullet)",
    line: "var(--theme-education-line)",
  },
} satisfies Record<string, Theme>;

const PAGE_INSET = "px-4 sm:px-6 md:px-[0.35in]";

// Inline rich text: bullet strings may contain `**bold**` runs. Split on the
// marker and alternate plain / strong nodes. Single convention, no nesting,
// no other inline formatting — widen here if that changes.
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

function Bullet({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[14px_1fr] items-start gap-x-1.5">
      <span aria-hidden className="select-none pt-[0.1em] text-center text-[7.5pt] leading-[1.4]" style={{ color: theme.bullet }}>
        •
      </span>
      <span className="min-w-0 leading-[1.4]">{children}</span>
    </li>
  );
}

function BulletList({ theme, bullets }: { theme: Theme; bullets: string[] }) {
  return (
    <ul className="text-(--resume-page-fg) space-y-[3pt]">
      {bullets.map((text, i) => (
        <Bullet key={i} theme={theme}>
          {renderRichText(text)}
        </Bullet>
      ))}
    </ul>
  );
}

function Section({ label, theme, children }: { label: string; theme: Theme; children: React.ReactNode }) {
  return (
    // `last:[&>div]:pb-0`: bottom inset on <article> already provides outer margin;
    // skipping section pb on the last block avoids stacking ~0.2in + article pb.
    <section className="border-t-[1.75pt] last:[&>div]:pb-0" style={{ borderTopColor: theme.line }}>
      <div
        className={`grid grid-cols-1 gap-y-2 print:grid-cols-[0.85in_1fr] print:gap-x-[0.3in] print:gap-y-0 md:grid-cols-[0.85in_1fr] md:gap-x-[0.3in] md:gap-y-0 ${PAGE_INSET} pb-[0.2in] pt-[0.2in]`}>
        <div className="text-[8.5pt] font-bold uppercase tracking-[0.05em]" style={{ color: theme.heading }}>
          {label}
        </div>
        <div className="space-y-[0.1in]">{children}</div>
      </div>
    </section>
  );
}

function ResumeHeader({ header }: { header: Resume["header"] }) {
  const linkCls = "text-(--resume-heading-fg) underline-offset-2 decoration-zinc-400/70 hover:underline dark:decoration-zinc-500";

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
    <p className="text-(--resume-muted-fg) mt-[5pt] max-w-full font-semibold italic leading-[1.35] print:col-start-2 print:row-start-2 print:mt-0 md:col-start-2 md:row-start-2 md:mt-0 md:max-w-[4.9in]">
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
          className="text-(--resume-heading-fg) text-[16pt] font-bold leading-[1.1] tracking-[0] print:col-start-2 print:row-start-1 md:col-start-2 md:row-start-1"
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

function EntryHead({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="text-(--resume-heading-fg) flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div className="font-semibold">{left}</div>
      {right && <div className="shrink-0 font-semibold">{right}</div>}
    </div>
  );
}

function SkillsBlock({ section }: { section: SkillsSection }) {
  return (
    <Section label={section.label} theme={themes.skills}>
      <BulletList theme={themes.skills} bullets={section.bullets} />
    </Section>
  );
}

function ProjectsBlock({ section }: { section: ProjectsSection }) {
  const theme = themes.projects;
  return (
    <Section label={section.label} theme={theme}>
      {section.entries.map((entry, i) => (
        <div key={i} className="space-y-[7pt] print:break-inside-avoid">
          <EntryHead left={entry.title} right={entry.dateRange} />
          <BulletList theme={theme} bullets={entry.bullets} />
        </div>
      ))}
    </Section>
  );
}

function ExperiencesBlock({ section }: { section: ExperiencesSection }) {
  const theme = themes.experiences;
  return (
    <Section label={section.label} theme={theme}>
      {section.entries.map((entry, i) => {
        const left = entry.organization ? (
          <>
            {entry.title} <span className="font-normal">at</span> {entry.organization}
          </>
        ) : (
          entry.title
        );
        return (
          <div key={i} className="space-y-[7pt] print:break-inside-avoid">
            <EntryHead left={left} right={entry.dateRange} />
            {entry.summary && <p>{entry.summary}</p>}
            <BulletList theme={theme} bullets={entry.bullets} />
          </div>
        );
      })}
    </Section>
  );
}

function EducationBlock({ section }: { section: EducationSection }) {
  const theme = themes.education;
  return (
    <Section label={section.label} theme={theme}>
      {section.entries.map((entry, i) => (
        <div key={i} className="space-y-[7pt] print:break-inside-avoid">
          <EntryHead left={entry.title} right={entry.dateRange} />
          {entry.bullets && entry.bullets.length > 0 && <BulletList theme={theme} bullets={entry.bullets} />}
        </div>
      ))}
    </Section>
  );
}

export default function Home() {
  const parsed = resumeSchema.safeParse(master);
  if (!parsed.success) {
    // Fail loud and readable. This is the error path the agent loop sees
    // when JSON drifts from the schema — surface z.prettifyError so edits
    // can be fixed without round-tripping through the console.
    return (
      <main className="min-h-screen bg-red-50 p-8 font-mono text-sm text-red-900 dark:bg-red-950/50 dark:text-red-100">
        <h1 className="mb-4 text-lg font-bold">resumes/master.json failed schema validation</h1>
        <pre className="whitespace-pre-wrap">{JSON.stringify(parsed.error.issues, null, 2)}</pre>
      </main>
    );
  }

  const { header, sections } = parsed.data;

  return (
    <main className="bg-(--resume-canvas) flex min-h-screen justify-center px-3 py-6 print:block print:bg-white print:p-0 sm:px-6 md:px-8">
      <ResumeScaler />
      <article className="bg-(--resume-surface) text-body relative min-h-0 w-full max-w-[8.5in] rounded-lg pb-[0.3in] pt-[0.35in] font-sans text-[8.5pt] leading-[1.4] shadow-md [zoom:var(--resume-scale)] print:min-h-[11in] print:w-[8.5in] print:max-w-[8.5in] print:rounded-none print:shadow-none print:[zoom:1] md:min-h-[11in] md:rounded-none">
        {/*
          Dev-only overflow warning. The template targets a single 8.5×11
          sheet; when content spills past 11in, PageEdge renders a red dashed
          rule at the boundary with the overflow magnitude. Stripped in
          production so the deployed page stays clean. Manual eyeballing /
          Chrome print preview remain the check in prod; a shared fit signal
          for `bun test` is deferred until pretext ships server-side.
        */}
        {process.env.NODE_ENV === "development" && <PageEdge />}
        <ResumeHeader header={header} />

        {sections.map((section, i) => {
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
      </article>
    </main>
  );
}
