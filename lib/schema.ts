import { z } from "zod";

// Provenance breadcrumb per AGENTS.md Strata hook — every section and entry
// can carry an optional `source` / `derivedFrom`. No render logic depends on
// these fields; they exist so upstream authoring tools (Strata, future MCP)
// can leave trails without coupling to the renderer.
const provenance = {
  source: z.string().optional(),
  derivedFrom: z.string().optional(),
};

// Bullet strings support a single inline convention: `**bold**` runs. The
// template parses this at render time. Any other inline formatting (italic,
// links, code) would require widening both the schema and the parser.
const bullet = z.string();

const contact = z.object({
  email: z.string(),
  links: z
    .array(
      z.object({
        url: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
});

const header = z.object({
  name: z.string(),
  // Subtitle is an array of lines rendered joined by <br />. Keeps line
  // breaks semantic (one logical line per array item) instead of shoving
  // `\n` or `<br />` into a single string.
  subtitle: z.array(z.string()),
  monomark: z.string().optional(),
  contact,
});

const skillsSection = z.object({
  kind: z.literal("skills"),
  label: z.string(),
  bullets: z.array(bullet),
  ...provenance,
});

const projectEntry = z.object({
  title: z.string(),
  dateRange: z.string().optional(),
  bullets: z.array(bullet),
  ...provenance,
});

const projectsSection = z.object({
  kind: z.literal("projects"),
  label: z.string(),
  entries: z.array(projectEntry),
  ...provenance,
});

const experienceEntry = z.object({
  title: z.string(),
  // When `organization` is set, the template renders `{title} at {organization}`
  // with "at" weakened. When absent (e.g. the VfA fellowship entry), the
  // title stands alone and may include its own " at " phrasing.
  organization: z.string().optional(),
  dateRange: z.string().optional(),
  summary: z.string().optional(),
  bullets: z.array(bullet),
  ...provenance,
});

const experiencesSection = z.object({
  kind: z.literal("experiences"),
  label: z.string(),
  entries: z.array(experienceEntry),
  ...provenance,
});

const educationEntry = z.object({
  title: z.string(),
  dateRange: z.string().optional(),
  bullets: z.array(bullet).optional(),
  ...provenance,
});

const educationSection = z.object({
  kind: z.literal("education"),
  label: z.string(),
  entries: z.array(educationEntry),
  ...provenance,
});

export const sectionSchema = z.discriminatedUnion("kind", [
  skillsSection,
  projectsSection,
  experiencesSection,
  educationSection,
]);

export const resumeSchema = z.object({
  header,
  sections: z.array(sectionSchema),
});

export type Resume = z.infer<typeof resumeSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SkillsSection = z.infer<typeof skillsSection>;
export type ProjectsSection = z.infer<typeof projectsSection>;
export type ExperiencesSection = z.infer<typeof experiencesSection>;
export type EducationSection = z.infer<typeof educationSection>;
