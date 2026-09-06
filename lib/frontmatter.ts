// A frontmatter block (`---` fenced YAML at the top of a markdown file) as a
// plain object, both directions. This is the subset of YAML the markdown
// dialect needs — `key: value` maps, `- item` lists, two-space nesting, and
// every scalar a string — not a YAML parser. Knows nothing about resumes.

export type FrontmatterIssue = { line: number; message: string };

export type ParsedFrontmatter = {
  value: Record<string, unknown>;
  /** 1-based line of each key, by dotted path (`contact.links.0.url`). */
  lines: Map<string, number>;
  /** Count of lines the block occupied, closing fence included. */
  length: number;
  issues: FrontmatterIssue[];
};

const FENCE = "---";

/**
 * Reads the block at the top of `lines`. Returns `undefined` when the file
 * does not open with a fence; the caller decides whether that is an error.
 */
export function parseFrontmatter(lines: string[]): ParsedFrontmatter | undefined {
  if (lines[0]?.trim() !== FENCE) return undefined;
  const close = lines.findIndex((line, index) => index > 0 && line.trim() === FENCE);
  const issues: FrontmatterIssue[] = [];
  if (close === -1) {
    issues.push({ line: 1, message: "frontmatter opens with `---` but never closes" });
    return { value: {}, lines: new Map(), length: lines.length, issues };
  }

  const parser = new BlockParser(lines.slice(1, close), 2, issues);
  const value = parser.parseMap(0, "");
  return { value, lines: parser.lines, length: close + 1, issues };
}

/** Renders `value` as a fenced block, the inverse of `parseFrontmatter`. */
export function formatFrontmatter(value: Record<string, unknown>): string {
  return [FENCE, ...formatMap(value, 0), FENCE].join("\n");
}

class BlockParser {
  index = 0;
  lines = new Map<string, number>();

  constructor(
    private readonly source: string[],
    private readonly offset: number,
    private readonly issues: FrontmatterIssue[],
  ) {}

  /** A map whose keys sit at `indent`. Stops at the first shallower line. */
  parseMap(indent: number, path: string): Record<string, unknown> {
    const value: Record<string, unknown> = {};
    for (;;) {
      const line = this.peek(indent);
      if (line === undefined) break;
      const pair = /^([^:]+?):(?:\s+(.*))?$/.exec(line.trim());
      if (!pair || line.trim().startsWith("- ")) {
        this.fail(`expected \`key: value\`, got \`${line.trim()}\``);
        this.index += 1;
        continue;
      }
      const key = pair[1].trim();
      const keyPath = path ? `${path}.${key}` : key;
      this.lines.set(keyPath, this.lineNumber());
      this.index += 1;
      value[key] = pair[2] === undefined || pair[2].trim() === ""
        ? this.parseBlock(indent + 2, keyPath)
        : this.scalar(pair[2]);
    }
    return value;
  }

  /** Whatever nests under a key with no inline value: a list, a map, or nothing (an empty list). */
  private parseBlock(indent: number, path: string): unknown {
    const line = this.peek(indent);
    if (line === undefined) return [];
    return line.trim().startsWith("- ") ? this.parseList(indent, path) : this.parseMap(indent, path);
  }

  private parseList(indent: number, path: string): unknown[] {
    const items: unknown[] = [];
    for (;;) {
      const line = this.peek(indent);
      if (line === undefined || !line.trim().startsWith("- ")) break;
      const itemPath = `${path}.${items.length}`;
      this.lines.set(itemPath, this.lineNumber());
      const rest = line.trim().slice(2);
      const pair = /^([^:]+?):(?:\s+(.*))?$/.exec(rest);
      if (pair && !rest.startsWith('"')) {
        // `- key: value` opens a map; its remaining keys sit two deeper.
        this.source[this.index] = " ".repeat(indent + 2) + rest;
        items.push(this.parseMap(indent + 2, itemPath));
      } else {
        this.index += 1;
        items.push(this.scalar(rest));
      }
    }
    return items;
  }

  private scalar(text: string): string {
    const trimmed = text.trim();
    if (!trimmed.startsWith('"')) return trimmed;
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch {
      // Fall through to the report below.
    }
    this.fail(`a quoted value must be a complete double-quoted string, got ${trimmed}`);
    return trimmed;
  }

  /**
   * The next non-blank line, when it sits at exactly `indent`. Returns
   * `undefined` at a shallower line (the enclosing block continues) or at the
   * end. A deeper line is an error; it is skipped.
   */
  private peek(indent: number): string | undefined {
    for (;;) {
      const line = this.source[this.index];
      if (line === undefined) return undefined;
      if (line.trim() === "") {
        this.index += 1;
        continue;
      }
      const depth = line.length - line.trimStart().length;
      if (depth < indent) return undefined;
      if (depth > indent) {
        this.fail(`unexpected indentation (${depth} spaces where ${indent} were expected)`);
        this.index += 1;
        continue;
      }
      return line;
    }
  }

  private lineNumber(): number {
    return this.index + this.offset;
  }

  private fail(message: string) {
    this.issues.push({ line: this.lineNumber(), message });
  }
}

function formatMap(value: Record<string, unknown>, indent: number): string[] {
  const pad = " ".repeat(indent);
  return Object.entries(value).flatMap(([key, item]) => {
    if (Array.isArray(item)) return [`${pad}${key}:`, ...formatList(item, indent + 2)];
    if (isRecord(item)) return [`${pad}${key}:`, ...formatMap(item, indent + 2)];
    return [`${pad}${key}: ${formatScalar(item)}`];
  });
}

function formatList(items: unknown[], indent: number): string[] {
  const pad = " ".repeat(indent);
  return items.flatMap((item) => {
    if (isRecord(item)) {
      const [first, ...rest] = formatMap(item, indent + 2);
      return [`${pad}- ${first.trimStart()}`, ...rest];
    }
    return [`${pad}- ${formatScalar(item)}`];
  });
}

/** Quotes only what the parser would otherwise misread. */
function formatScalar(value: unknown): string {
  const text = String(value);
  return /^$|^["'#\-[{]|:(\s|$)|^\s|\s$|\n/.test(text) ? JSON.stringify(text) : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
