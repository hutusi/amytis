import { describe, expect, test } from "bun:test";
import { generateExcerpt } from "./markdown";

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
      expect(generateExcerpt(text)).toBe("Check this link");
    });
  });
});
