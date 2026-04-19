type Theme = {
  heading: string;
  bullet: string;
  line: string;
};

const themes = {
  skills: { heading: "#074F3B", bullet: "#065F46", line: "#D1EADE" },
  projects: { heading: "#4C1D95", bullet: "#6E28D9", line: "#E0DAFE" },
  experiences: { heading: "#1E3A8A", bullet: "#1C4ED8", line: "#D2E4FE" },
  education: { heading: "#7D2D12", bullet: "#C2410C", line: "#F4E1CA" },
} satisfies Record<string, Theme>;

const PAGE_PX = "px-[0.4in]";

function Bullet({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[10px_1fr] gap-x-1.5">
      <span aria-hidden className="select-none text-[6pt] leading-[1.6]" style={{ color: theme.bullet }}>
        •
      </span>
      <span>{children}</span>
    </li>
  );
}

function Section({ label, theme, children }: { label: string; theme: Theme; children: React.ReactNode }) {
  return (
    <section className="border-t-[1.75pt]" style={{ borderTopColor: theme.line }}>
      <div className={`grid grid-cols-[0.85in_1fr] gap-x-[0.3in] ${PAGE_PX} pb-[0.2in] pt-[0.2in]`}>
        <div className="text-[8pt] font-bold uppercase tracking-[0.05em]" style={{ color: theme.heading }}>
          {label}
        </div>
        <div className="space-y-[0.14in]">{children}</div>
      </div>
    </section>
  );
}

function EntryHead({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="font-semibold">{left}</div>
      {right && <div className="shrink-0 font-semibold">{right}</div>}
    </div>
  );
}

export default function Home() {
  const { skills, projects, experiences, education } = themes;

  return (
    <main className="flex min-h-screen justify-center bg-zinc-100 py-8 print:block print:bg-white print:p-0">
      <article
        className="h-[11in] w-[8.5in] overflow-hidden bg-white py-[0.4in] font-sans text-[8pt] leading-[1.4] tracking-[0.03em] shadow-md [zoom:min(1,calc((100vw_-_2rem)/816px))] print:shadow-none print:[zoom:1]"
        style={{ color: "#3F3F46" }}>
        <div className={`${PAGE_PX} pb-[0.16in]`}>
          <div className="grid grid-cols-[0.85in_1fr_auto] items-start gap-x-[0.3in]">
            <div />
            <div>
              <h1
                className="text-[16pt] font-semibold leading-[1.1] tracking-[0] text-zinc-900"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStretch: "125%",
                }}>
                Nathan Cheng
              </h1>
              <p className="mt-[5pt] max-w-[4.9in] font-semibold italic leading-[1.35]">
                Designer who codes, with a background in film studies and graphic design.
                <br />
                Bridges design, development, and business needs to make complex systems legible.
              </p>
            </div>
            <div className="flex flex-col items-end gap-[5pt]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/monomark.svg" alt="Nathan Cheng monomark" className="h-[18pt] w-auto" />
              <div className="text-right font-semibold leading-[1.35]">
                <div>
                  <a href="mailto:nthn.wei@gmail.com">nthn.wei@gmail.com</a>
                </div>
                <div>
                  <a href="https://nathancheng.work" target="_blank" rel="noopener noreferrer">
                    nathancheng.work
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Section label="Skills" theme={skills}>
          <ul className="space-y-[1.5pt]">
            <Bullet theme={skills}>
              <strong className="font-semibold">Design &amp; UX:</strong> Interface design, Design systems, Information architecture, Prototyping, Visual design
            </Bullet>
            <Bullet theme={skills}>
              <strong className="font-semibold">Development:</strong> JavaScript/React, HTML/CSS, Tailwind, Next.js, Git, Responsive design, AI workflows, MCPs
            </Bullet>
            <Bullet theme={skills}>
              <strong className="font-semibold">Tools &amp; Platforms:</strong> Cursor, Figma, Sanity CMS, Notion, Obsidian; Prompt engineering, Production LLMs
            </Bullet>
          </ul>
        </Section>

        <Section label="Projects" theme={projects}>
          <div className="space-y-[4pt]">
            <EntryHead left="Full-stack portfolio website" right="2024 - 2025" />
            <ul className="space-y-[1.5pt]">
              <Bullet theme={projects}>
                <strong className="font-semibold">Built portfolio system</strong> (Next.js + Sanity CMS) presenting multi-medium career collections
              </Bullet>
              <Bullet theme={projects}>
                <strong className="font-semibold">Designed flexible content architecture separating project data from presentation:</strong> Built schemas supporting mixed media with metadata-driven
                filtering, enabling layout changes without content migration
              </Bullet>
              <Bullet theme={projects}>
                <strong className="font-semibold">Implemented iOS-quality interactions:</strong> Custom lightbox with origin-aware transitions, scroll-driven animations for card stacking effects,
                URL-based filter sharing; prioritized perceived performance with motion timing + progressive loading
              </Bullet>
              <Bullet theme={projects}>
                <strong className="font-semibold">Shipped to production replacing legacy Cargo site:</strong> Handled full deployment including Vercel hosting, Sanity Studio configuration, DNS setup,
                and cache revalidation webhooks
              </Bullet>
            </ul>
          </div>
          <div className="space-y-[4pt]">
            <EntryHead left="Personal digital infrastructure and tools" right="Ongoing" />
            <ul className="space-y-[1.5pt]">
              <Bullet theme={projects}>
                <strong className="font-semibold">Designed information architecture for personal knowledge system:</strong> Created metadata schema and linking structure across 1000+ notes supporting
                exploratory browsing, maintainability, and long-term retrieval (nathancheng.fyi)
              </Bullet>
              <Bullet theme={projects}>
                <strong className="font-semibold">AI workflows:</strong> 80+ prompts following best practices (reasoning considerations, examples, multi-phase frameworks)
              </Bullet>
            </ul>
          </div>
        </Section>

        <Section label="Experiences" theme={experiences}>
          <div className="space-y-[3pt]">
            <EntryHead
              left={
                <>
                  Design and Systems Manager <span className="font-normal">at</span> TALtech
                </>
              }
              right="2021 - Present"
            />
            <p>Solo designer / systems manager at family-run B2B software company (users at 3M, EPA, Lilly, PepsiCo).</p>
            <ul className="space-y-[1.5pt]">
              <Bullet theme={experiences}>
                <strong className="font-semibold">Designed workflow builder interface unifying 40+ configuration options:</strong> Studied Windows UI patterns, created component system with
                progressive disclosure for serial device communication
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Reduced recurring setup questions ~30%</strong> by producing walkthrough video series replacing 90s-era documentation—scripted, recorded, and edited
                with motion graphics
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Led website redesign (500+ pages → focused content):</strong> Created wireframes, partnered with agency on WordPress build, refined typography and
                layout with custom CSS
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Planned e-commerce platform architecture:</strong> Data models, offline licensing flows, and Stripe integration to replace legacy store with modern
                stack supporting B2B/reseller workflows
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Leveraged direct customer support experience</strong> to identify UX pain points, shaping design and documentation priorities
              </Bullet>
            </ul>
          </div>
          <div className="space-y-[3pt]">
            <EntryHead
              left={
                <>
                  Designer and Developer <span className="font-normal">at</span> Foundation Studio
                </>
              }
              right="2024"
            />
            <ul className="space-y-[1.5pt]">
              <Bullet theme={experiences}>
                <strong className="font-semibold">Built React/Next.js config generator for LLM interview chatbot:</strong> Form validation &amp; conditional logic reducing setup errors for screening
                question flows
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Wrote Python script workaround to preserve image fidelity</strong> when late-notice Techstars delivery requirements revealed Google Slides compression
                would degrade designs
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Led pitch deck strategy (3 startups):</strong> Competitor analysis, market positioning, visual direction for investor presentations
              </Bullet>
            </ul>
          </div>
          <div className="space-y-[3pt]">
            <EntryHead left="Fellowship at Venture for America (now Ember Fellowship)" right="2023 - 2024" />
            <ul className="space-y-[1.5pt]">
              <Bullet theme={experiences}>
                <strong className="font-semibold">Selected for competitive entrepreneurship fellowship (10% acceptance);</strong> trained in product strategy and design thinking with IDEO and Frog
                Design workshops
              </Bullet>
              <Bullet theme={experiences}>
                <strong className="font-semibold">Led 5-person team to win Judge Pick and Crowd Favorite in 3-day product sprint:</strong> Defined MVP scope, designed UI prototypes, pitched city
                exploration app to VC/executive panel
              </Bullet>
            </ul>
          </div>
        </Section>

        <Section label="Education" theme={education}>
          <div className="space-y-[3pt]">
            <EntryHead left="Web development foundations (The Odin Project) + Animations on the Web (Emil Kowalski)" right="2022 - 2024" />
          </div>
          <div className="space-y-[3pt]">
            <EntryHead left="Wesleyan University - B.A. in Film Studies, Minor in Integrated Design and Engineering" right="2016 - 2020" />
            <ul className="space-y-[1.5pt]">
              <Bullet theme={education}>
                <strong className="font-semibold">3.71 GPA;</strong> Honors, Dean&apos;s List; Frank Capra Prize for technical excellence in filmmaking and humor
              </Bullet>
              <Bullet theme={education}>
                <strong className="font-semibold">Led team to first place in videogame dev intensive led by Bethesda founder:</strong> Managed 4-person team from concept to iOS demo, planned level
                structure and art direction, enhanced visuals in Unity game engine, pitched to industry jury (Harmonix, Warner Bros. Games, Demiurge)
              </Bullet>
              <Bullet theme={education}>Relevant coursework: How to Design Programs (Pyret), Data Visualization (R/Shiny), Form and Code (Processing)</Bullet>
            </ul>
          </div>
        </Section>
      </article>
    </main>
  );
}
