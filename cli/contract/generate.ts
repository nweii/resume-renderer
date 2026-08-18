// Renders the agent-facing content contract (docs/schema-contract.md) from
// the Zod schema, so the document an agent reads and the validator that
// judges its output can never drift apart.
//
// The format: a heading per shape, then one flattened TypeScript-ish line per
// entry — `?` on optional fields, `.describe()` prose beside the type it
// belongs to. Nested objects expand one level; deeper shapes print as a name.

import { z } from "zod";

import { resumeSchema, sectionSchema } from "@/lib/schema";

export const CONTRACT_FILE = "docs/schema-contract.md";

/** Absolute path to the contract, independent of the caller's cwd. */
export const CONTRACT_PATH = new URL(
  `../../${CONTRACT_FILE}`,
  import.meta.url,
).pathname;

export function renderContract(): string {
  const resume = z.toJSONSchema(resumeSchema, { io: "input" }) as JsonSchema;
  const definitions = resume.$defs ?? {};
  const header = resume.properties?.header ?? {};
  const contact = resolve(header, definitions).properties?.contact ?? {};

  const union = z.toJSONSchema(sectionSchema, { io: "input" }) as JsonSchema;
  const members = (union.anyOf ?? union.oneOf ?? []) as JsonSchema[];
  const unionDefs = union.$defs ?? {};
  const kinds = members.map(
    (member) => `- ${formatKind(member, unionDefs)}`,
  );

  return [
    "# Content contract",
    "",
    "Generated from `lib/schema.ts` by `bun run cli contract`. Do not edit by hand — edit the schema and regenerate. `bun run check` fails while this file is stale.",
    "",
    "Reading a line: `?` marks an optional field, `/* … */` carries the field's prose, and a capitalized bare name (`Header`, `Contact`) is a shape defined under its own heading.",
    "",
    "## Document shape",
    "",
    `- resume(${formatObject(resume, definitions, 1)})`,
    "",
    "## Header",
    "",
    `- Header = ${formatObject(resolve(header, definitions), definitions, 1)}`,
    `- Contact = ${formatObject(resolve(contact, definitions), definitions, 0)}`,
    "",
    `## Section kinds (${members.length})`,
    "",
    ...kinds,
    "",
  ].join("\n");
}

type JsonSchema = {
  type?: string;
  const?: unknown;
  title?: string;
  description?: string;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
};

type Definitions = Record<string, JsonSchema>;

/** One kind as `name({ fields }) — prose`, with the discriminator lifted out. */
function formatKind(member: JsonSchema, definitions: Definitions): string {
  const properties = { ...member.properties };
  const kind = properties.kind?.const;
  const prose = properties.kind?.description;
  delete properties.kind;
  const fields = formatObject({ ...member, properties }, definitions, 0);
  return `${String(kind)}(${fields})${prose ? ` — ${prose}` : ""}`;
}

function formatObject(
  schema: JsonSchema,
  definitions: Definitions,
  depth: number,
): string {
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(
    ([name, field]) => {
      const optional = required.has(name) ? "" : "?";
      const type = formatType(field, definitions, depth + 1, name);
      // An array field's prose may live on its item schema (a described
      // element type reused across fields, like `bullet`).
      const description =
        field.description ?? resolve(field, definitions).items?.description;
      const prose = description ? ` /* ${description} */` : "";
      return `${name}${optional}: ${type}${prose}`;
    },
  );
  return `{ ${fields.join(", ")} }`;
}

/** One field's type. `depth` counts objects entered; past one, print a name. */
function formatType(
  schema: JsonSchema,
  definitions: Definitions,
  depth: number,
  fieldName: string,
): string {
  const resolved = resolve(schema, definitions);
  if (resolved.anyOf || resolved.oneOf) return "Section";
  if (resolved.type === "array") {
    return `${formatType(resolved.items ?? {}, definitions, depth, fieldName)}[]`;
  }
  if (resolved.type === "object" || resolved.properties) {
    if (depth > 1) return nameOf(schema, resolved, fieldName);
    return formatObject(resolved, definitions, depth);
  }
  return resolved.type ?? "unknown";
}

/** A schema written elsewhere in the document and pointed at by `$ref`. */
function resolve(schema: JsonSchema, definitions: Definitions): JsonSchema {
  const name = refName(schema);
  return (name && definitions[name]) || schema;
}

function refName(schema: JsonSchema): string | undefined {
  return schema.$ref?.split("/").pop();
}

/** The name a shape prints under once it is too deep to expand. */
function nameOf(
  schema: JsonSchema,
  resolved: JsonSchema,
  fieldName: string,
): string {
  const name = resolved.title ?? refName(schema) ?? fieldName;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
