/**
 * Section accent colors for the `current` resume template.
 * Values are CSS custom properties defined in `app/globals.css` under the
 * `--t-current-*` namespace (light, dark, print).
 */
export type SectionAccent = {
  heading: string;
  bullet: string;
  line: string;
};

export const currentSectionAccents = {
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
