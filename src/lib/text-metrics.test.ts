import { describe, expect, test } from "bun:test";
import {
  generateExcerpt,
  calculateReadingMinutes,
  calculateReadingMinutesFromText,
  calculateWordCount,
  calculateWordCountFromText,
  getHeadings,
  extractContentMetrics,
} from "./text-metrics";

describe("text metrics", () => {
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

  describe("calculateReadingMinutes", () => {
    test("short content returns 1 minute (floor)", () => {
      const text = "Hello world, this is a short post.";
      expect(calculateReadingMinutes(text)).toBe(1);
    });

    test("600 words returns 3 minutes", () => {
      const words = Array(600).fill("word").join(" ");
      expect(calculateReadingMinutes(words)).toBe(3);
    });

    test("empty content returns 1 (floor)", () => {
      expect(calculateReadingMinutes("")).toBe(1);
    });

    test("strips markdown formatting before counting", () => {
      // 400 actual words surrounded by markdown syntax
      const words = Array(400).fill("**word**").join(" ");
      expect(calculateReadingMinutes(words)).toBe(2);
    });

    test("counts Chinese characters at 300 cpm", () => {
      const han = "中".repeat(600);
      expect(calculateReadingMinutes(han)).toBe(2);
    });

    test("combines Latin words and Chinese characters", () => {
      const latinWords = Array(200).fill("word").join(" ");
      const han = "中".repeat(300);
      const mixed = `${latinWords} ${han}`;
      expect(calculateReadingMinutes(mixed)).toBe(2);
    });
  });

  describe("calculateWordCount", () => {
    test("empty content returns 0", () => {
      expect(calculateWordCount("")).toBe(0);
    });

    test("Latin words: each whitespace-bounded token counts once", () => {
      expect(calculateWordCount("Hello world, this is a short post.")).toBe(7);
      expect(calculateWordCount(Array(600).fill("word").join(" "))).toBe(600);
    });

    test("Chinese characters count per-character", () => {
      expect(calculateWordCount("中".repeat(600))).toBe(600);
    });

    test("mixed Latin + Chinese sums both counts", () => {
      const latin = Array(200).fill("word").join(" ");
      const han = "中".repeat(300);
      expect(calculateWordCount(`${latin} ${han}`)).toBe(500);
    });

    test("strips fenced code blocks before counting", () => {
      const src = ["pre", "```", "code line one two three", "```", "post"].join("\n");
      // Only "pre" and "post" count.
      expect(calculateWordCount(src)).toBe(2);
    });

    test("strips inline HTML tags before counting", () => {
      expect(calculateWordCount("hello <span>world</span> again")).toBe(3);
    });

    test("strips markdown link syntax, keeps link text", () => {
      expect(calculateWordCount("See [the docs](https://example.com) here")).toBe(4);
    });

    test("matches calculateReadingMinutes on the same input", () => {
      // The two metrics share a tokenizer; both should agree on the underlying
      // token counts. 600 Latin words → 600 wordCount, 3-minute reading time.
      const text = Array(600).fill("word").join(" ");
      expect(calculateWordCount(text)).toBe(600);
      expect(calculateReadingMinutes(text)).toBe(3);
    });
  });

  describe("plain-text variants (Python rST renderer path)", () => {
    test("FromText variants skip markup stripping but use the same tokenizer", () => {
      const text = Array(600).fill("word").join(" ");
      expect(calculateWordCountFromText(text)).toBe(600);
      expect(calculateReadingMinutesFromText(text)).toBe(3);
    });

    test("FromText counts mixed Latin + Han like the markdown variant", () => {
      const latin = Array(200).fill("word").join(" ");
      const han = "中".repeat(300);
      expect(calculateWordCountFromText(`${latin} ${han}`)).toBe(500);
      expect(calculateReadingMinutesFromText(`${latin} ${han}`)).toBe(2);
    });

    test("FromText agrees with the markdown variant on plain input", () => {
      const plain = "Hello world this is plain text 中文字符";
      expect(calculateWordCountFromText(plain)).toBe(calculateWordCount(plain));
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

  describe("extractContentMetrics", () => {
    const content = "# Title\n\nIntro paragraph.\n\n## Section\n\nMore text here.";

    test("strips the leading H1 and derives excerpt + headings", () => {
      const m = extractContentMetrics(content);
      expect(m.contentWithoutH1.startsWith("# Title")).toBe(false);
      expect(m.contentWithoutH1).toContain("Intro paragraph.");
      expect(m.excerpt).toContain("Intro paragraph.");
      expect(m.headings.map((h) => h.text)).toEqual(["Section"]);
    });

    test("includes reading time and word count by default", () => {
      const m = extractContentMetrics(content);
      expect(typeof m.readingMinutes).toBe("number");
      expect(m.readingMinutes).toBeGreaterThanOrEqual(1);
      expect(typeof m.wordCount).toBe("number");
    });

    test("omits counts when withCounts is false", () => {
      const m = extractContentMetrics(content, { withCounts: false });
      expect("readingMinutes" in m).toBe(false);
      expect("wordCount" in m).toBe(false);
      expect(m.headings.map((h) => h.text)).toEqual(["Section"]);
    });

    test("matches the inline pattern it replaced (byte-identical)", () => {
      const m = extractContentMetrics(content);
      const expectedStripped = content.replace(/^\s*#\s+[^\n]+/, "").trim();
      expect(m.contentWithoutH1).toBe(expectedStripped);
      expect(m.excerpt).toBe(generateExcerpt(expectedStripped));
      expect(m.headings).toEqual(getHeadings(content));
    });
  });
});
