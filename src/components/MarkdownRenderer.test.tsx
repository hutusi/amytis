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
      // fetchpriority="low" prevents React 19 from auto-preloading external
      // images as LCP candidates, avoiding "preloaded but not used" warnings
      expect(html).toContain('fetchPriority="low"');
    });

    test("bypasses optimization for local avif images", () => {
      const content = "![alt text](/images/background-new-wave.avif)";
      const html = renderToStaticMarkup(<MarkdownRenderer content={content} />);
      expect(html).toContain('src="/images/background-new-wave.avif"');
      expect(html).not.toContain('nextImageExportOptimizer');
      expect(html).not.toContain('background-image:url');
    });

    test("bypasses optimization for local webp images", () => {
      const content = "![alt text](/images/already-optimized.webp)";
      const html = renderToStaticMarkup(<MarkdownRenderer content={content} />);
      expect(html).toContain('src="/images/already-optimized.webp"');
      expect(html).not.toContain('nextImageExportOptimizer');
      expect(html).not.toContain('background-image:url');
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

  test("wraps content in a background container for copy-paste fidelity", () => {
    const content = "Hello world";
    const html = renderToStaticMarkup(<MarkdownRenderer content={content} />);
    expect(html).toMatch(/class="[^"]*\bbg-background\b[^"]*"/);
  });
});
