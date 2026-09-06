// ABOUTME: Tests for the frontmatter subset: nesting, lists, quoting, the
// per-key line map that error reports rely on, and format/parse symmetry.

import { describe, expect, test } from "bun:test";

import { formatFrontmatter, parseFrontmatter } from "@/lib/frontmatter";

describe("parseFrontmatter", () => {
  test("returns nothing when the file does not open with a fence", () => {
    expect(parseFrontmatter(["# Title", "text"])).toBeUndefined();
  });

  test("reads nested maps, scalar lists, and lists of maps, recording each key's line", () => {
    const parsed = parseFrontmatter([
      "---",
      "name: Mira",
      "subtitle:",
      "  - One",
      "  - Two",
      "contact:",
      "  email: m@example.com",
      "  links:",
      "    - url: tel:+1",
      "      label: phone",
      "---",
      "body",
    ]);
    expect(parsed?.value).toEqual({
      name: "Mira",
      subtitle: ["One", "Two"],
      contact: { email: "m@example.com", links: [{ url: "tel:+1", label: "phone" }] },
    });
    expect(parsed?.length).toBe(11);
    expect(parsed?.lines.get("contact.links.0.label")).toBe(10);
    expect(parsed?.lines.get("subtitle.1")).toBe(5);
    expect(parsed?.issues).toEqual([]);
  });

  test("a bare key is an empty list", () => {
    expect(parseFrontmatter(["---", "subtitle:", "---"])?.value).toEqual({ subtitle: [] });
  });

  test("reports an unclosed fence and bad indentation by line", () => {
    expect(parseFrontmatter(["---", "name: x"])?.issues).toEqual([
      { line: 1, message: "frontmatter opens with `---` but never closes" },
    ]);
    const [issue] = parseFrontmatter(["---", "name: x", "   stray: y", "---"])?.issues ?? [];
    expect(issue.line).toBe(3);
    expect(issue.message).toContain("indentation");
  });
});

describe("formatFrontmatter", () => {
  test("round-trips values the parser would otherwise misread", () => {
    const value = {
      name: "Quoted: name",
      subtitle: ["- leading dash", "", " padded ", 'say "hi"'],
      contact: { email: "e@x", links: [{ url: "a: b", label: "#tag" }] },
    };
    const text = formatFrontmatter(value);
    expect(parseFrontmatter(text.split("\n"))?.value).toEqual(value);
  });

  test("leaves ordinary values unquoted", () => {
    expect(formatFrontmatter({ url: "tel:+1", label: "(212) 555-0147" })).toBe(
      "---\nurl: tel:+1\nlabel: (212) 555-0147\n---",
    );
  });
});
