import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import CodeBlock from "./CodeBlock";

async function renderCodeBlock(element: Awaited<ReturnType<typeof CodeBlock>>): Promise<string> {
  return renderToStaticMarkup(element);
}

describe("CodeBlock", () => {
  test("keeps code scrolling inside its own container", async () => {
    const element = await CodeBlock({
      language: "typescript",
      children: "const veryLongLine = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';",
    });
    const html = await renderCodeBlock(element);

    expect(html).toContain("relative my-6 w-full min-w-0 max-w-full");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("overflow-y-hidden");
    expect(html).toContain("cb-root");
    expect(html).toContain('class="shiki');
  });
});
