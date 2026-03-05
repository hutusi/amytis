import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownRenderer from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
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
