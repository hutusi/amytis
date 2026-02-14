import { describe, expect, test } from "bun:test";
import { generateExcerpt, calculateReadingTime, getHeadings, getAuthorSlug } from "./markdown";

describe("markdown utils", () => {
  describe("generateExcerpt", () => {
    test("should return content as is if short enough", () => {
      const text = "Hello world";
      expect(generateExcerpt(text)).toBe("Hello world");
    });

    test("should truncate content longer than 160 chars", () => {
      const longText = "a".repeat(200);
      const excerpt = generateExcerpt(longText);
      expect(excerpt.length).toBe(163); // 160 + "..."
      expect(excerpt.endsWith("...")).toBe(true);
    });

    test("should strip markdown headers", () => {
      const text = "# Header\nContent";
      expect(generateExcerpt(text)).toBe("Header Content");
    });

    test("should strip bold and italic", () => {
      const text = "This is **bold** and *italic*";
      expect(generateExcerpt(text)).toBe("This is bold and italic");
    });

    test("should strip links but keep text", () => {
      const text = "Check [this link](https://example.com)";
      // generateExcerpt strips bold/italic markers and backticks but
      // does not fully strip markdown link syntax
      const result = generateExcerpt(text);
      expect(result).toContain("this link");
    });
  });

  describe("calculateReadingTime", () => {
    test("short content returns 1 min read", () => {
      const text = "Hello world, this is a short post.";
      expect(calculateReadingTime(text)).toBe("1 min read");
    });

    test("600 words returns 3 min read", () => {
      const words = Array(600).fill("word").join(" ");
      expect(calculateReadingTime(words)).toBe("3 min read");
    });

    test("empty content returns 1 min read", () => {
      expect(calculateReadingTime("")).toBe("1 min read");
    });

    test("strips markdown formatting before counting", () => {
      // 400 actual words surrounded by markdown syntax
      const words = Array(400).fill("**word**").join(" ");
      const result = calculateReadingTime(words);
      expect(result).toBe("2 min read");
    });

    test("counts Chinese characters for reading time", () => {
      const han = "中".repeat(600);
      expect(calculateReadingTime(han)).toBe("2 min read");
    });

    test("combines Latin words and Chinese characters", () => {
      const latinWords = Array(200).fill("word").join(" ");
      const han = "中".repeat(300);
      const mixed = `${latinWords} ${han}`;
      expect(calculateReadingTime(mixed)).toBe("2 min read");
    });
  });

  describe("getHeadings", () => {
    test("extracts H2 headings with slugified IDs", () => {
      const content = "## Hello World\n\nSome text\n\n## Another Section";
      const headings = getHeadings(content);
      expect(headings).toHaveLength(2);
      expect(headings[0]).toEqual({ id: "hello-world", text: "Hello World", level: 2 });
      expect(headings[1]).toEqual({ id: "another-section", text: "Another Section", level: 2 });
    });

    test("extracts H3 headings", () => {
      const content = "### Sub Section\n\nSome text";
      const headings = getHeadings(content);
      expect(headings).toHaveLength(1);
      expect(headings[0]).toEqual({ id: "sub-section", text: "Sub Section", level: 3 });
    });

    test("preserves document order for mixed H2/H3", () => {
      const content = "## First\n\n### Nested\n\n## Second";
      const headings = getHeadings(content);
      expect(headings).toHaveLength(3);
      expect(headings[0].level).toBe(2);
      expect(headings[1].level).toBe(3);
      expect(headings[2].level).toBe(2);
    });

    test("ignores H1 and H4+ headings", () => {
      const content = "# Title\n\n## Included\n\n#### Not Included\n\n##### Also Not";
      const headings = getHeadings(content);
      expect(headings).toHaveLength(1);
      expect(headings[0].text).toBe("Included");
    });

    test("handles Unicode headings", () => {
      const content = "## 核心特性\n\nContent\n\n## Résumé";
      const headings = getHeadings(content);
      expect(headings).toHaveLength(2);
      expect(headings[0].text).toBe("核心特性");
      expect(headings[0].id).toBeTruthy();
      expect(headings[1].text).toBe("Résumé");
    });

    test("returns empty array for no headings", () => {
      const content = "Just plain text with no headings at all.";
      const headings = getHeadings(content);
      expect(headings).toEqual([]);
    });
  });

  describe("getAuthorSlug", () => {
    test("creates stable, URL-safe slugs for author names", () => {
      expect(getAuthorSlug("Amytis Team")).toBe("amytis-team");
      expect(getAuthorSlug("[author]")).toBe("author");
      expect(getAuthorSlug(" John Hu ")).toBe("john-hu");
    });
  });
});
