import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownRenderer from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  describe("image rendering", () => {
    test("uses ExportedImage with fallback dimensions for local images without known dimensions", () => {
      const content = "![alt text](/images/local.jpg)";
      const html = renderToStaticMarkup(<MarkdownRenderer content={content} />);
      // ExportedImage is used with 1200x900 fallback when no dimensions are known
      expect(html).toContain('width="1200"');
      expect(html).toContain('height="900"');
      // style override ensures the image renders at its natural size
      expect(html).toContain('width:100%');
    });

    test("uses plain img for external images", () => {
      const content = "![alt text](https://example.com/image.jpg)";
      const html = renderToStaticMarkup(<MarkdownRenderer content={content} />);
      expect(html).toContain('src="https://example.com/image.jpg"');
      // No fallback dimensions — external images are not processed by ExportedImage
      expect(html).not.toContain('width="1200"');
    });
  });

  test("adds horizontal overflow containment while preserving code scrolling", () => {
    const content = [
      "## Example",
      "",
      "```bash",
      "echo this-is-a-very-long-line-that-should-scroll-inside-the-code-block",
      "```",
    ].join("\n");

    const html = renderToStaticMarkup(<MarkdownRenderer content={content} />);

    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("not-prose w-full min-w-0 max-w-full");
    expect(html).toContain("overflow-x-auto");
  });
});
