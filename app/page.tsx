import master from "@/resumes/master.json";
import { resumeSchema, type EducationSection, type ExperiencesSection, type ProjectsSection, type SkillsSection } from "@/lib/schema";
import { PageEdge } from "./PageEdge";

type Theme = {
  heading: string;
  bullet: string;
  line: string;
};

// Theme colors live in the template, not the JSON. Each section kind owns a
// `{ heading, bullet, line }` hex triple; resume data only tags sections by
// kind. Tailwind v4's directional border-color utilities don't reliably
// extend custom color tokens, so these are applied via inline `style`.
const themes = {
  skills: { heading: "#074F3B", bullet: "#065F46", line: "#D1EADE" },
  projects: { heading: "#4C1D95", bullet: "#6E28D9", line: "#E0DAFE" },
  experiences: { heading: "#1E3A8A", bullet: "#1C4ED8", line: "#D2E4FE" },
  education: { heading: "#7D2D12", bullet: "#C2410C", line: "#F4E1CA" },
} satisfies Record<string, Theme>;

const PAGE_PX = "px-[0.35in]";

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
    <ul className="space-y-[1.5pt]">
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
      <div className={`grid grid-cols-[0.85in_1fr] gap-x-[0.3in] ${PAGE_PX} pb-[0.2in] pt-[0.2in]`}>
        <div className="text-[8.5pt] font-bold uppercase tracking-[0.05em]" style={{ color: theme.heading }}>
          {label}
        </div>
        <div className="space-y-[0.14in]">{children}</div>
      </div>
    </section>
  );
}

function EntryHead({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-black">
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
        <div key={i} className="space-y-[4pt] print:break-inside-avoid">
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
          <div key={i} className="space-y-[3pt] print:break-inside-avoid">
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
        <div key={i} className="space-y-[3pt] print:break-inside-avoid">
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
      <main className="min-h-screen bg-red-50 p-8 font-mono text-sm text-red-900">
        <h1 className="mb-4 text-lg font-bold">resumes/master.json failed schema validation</h1>
        <pre className="whitespace-pre-wrap">{JSON.stringify(parsed.error.issues, null, 2)}</pre>
      </main>
    );
  }

  const { header, sections } = parsed.data;

  return (
    <main className="flex min-h-screen justify-center bg-zinc-100 py-8 print:block print:bg-white print:p-0">
      <article
        className="relative min-h-[11in] w-[8.5in] bg-white pb-[0.4in] pt-[0.35in] font-sans text-[8.5pt] leading-[1.4] shadow-md [zoom:min(1,calc((100vw-2rem)/816px))] print:shadow-none print:[zoom:1]"
        style={{ color: "#3F3F46" }}>
        {/*
          Dev-only overflow warning. The template targets a single 8.5×11
          sheet; when content spills past 11in, PageEdge renders a red dashed
          rule at the boundary with the overflow magnitude. Stripped in
          production so the deployed page stays clean. Manual eyeballing /
          Chrome print preview remain the check in prod; a shared fit signal
          for `bun test` is deferred until pretext ships server-side.
        */}
        {process.env.NODE_ENV === "development" && <PageEdge />}
        <div className={`${PAGE_PX} pb-[0.16in]`}>
          <div className="grid grid-cols-[0.85in_1fr_auto] items-start gap-x-[0.3in]">
            <div />
            <div>
              <h1 className="text-[16pt] font-bold leading-[1.1] tracking-[0] text-zinc-900" style={{ fontFamily: "var(--font-display)" }}>
                {header.name}
              </h1>
              <p className="mt-[5pt] max-w-[4.9in] font-semibold italic leading-[1.35]">
                {header.subtitle.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < header.subtitle.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex flex-col items-end gap-[5pt]">
              {header.monomark && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={header.monomark} alt={`${header.name} monomark`} className="h-[18pt] w-auto" />
              )}
              <div className="text-right font-semibold leading-[1.35]">
                <div>
                  <a href={`mailto:${header.contact.email}`}>{header.contact.email}</a>
                </div>
                {header.contact.website && (
                  <div>
                    <a href={header.contact.website.url} target="_blank" rel="noopener noreferrer">
                      {header.contact.website.label}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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
