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

  test("renders title bar when title prop is set", async () => {
    const element = await CodeBlock({
      language: "ts",
      title: "src/app.ts",
      children: "export const x = 1;",
    });
    const html = await renderCodeBlock(element);

    expect(html).toContain("cb-title");
    expect(html).toContain("src/app.ts");
  });

  test("flags <pre> with data-line-numbers when showLineNumbers is true", async () => {
    const element = await CodeBlock({
      language: "js",
      showLineNumbers: true,
      children: "const x = 1;\nconst y = 2;",
    });
    const html = await renderCodeBlock(element);

    expect(html).toContain('data-line-numbers="true"');
  });

  test("marks highlighted lines from highlightLines prop", async () => {
    const element = await CodeBlock({
      language: "ts",
      highlightLines: [2, 4],
      children: "const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;",
    });
    const html = await renderCodeBlock(element);

    expect(html).toContain('data-highlighted-line="2"');
    expect(html).toContain('data-highlighted-line="4"');
    expect(html).not.toContain('data-highlighted-line="1"');
    expect(html).not.toContain('data-highlighted-line="3"');
  });

  test("applies diff add/remove classes for +/- lines in diff fences", async () => {
    const element = await CodeBlock({
      language: "diff",
      children: "-removed\n+added\n unchanged",
    });
    const html = await renderCodeBlock(element);

    expect(html).toContain("diff add");
    expect(html).toContain("diff remove");
  });

  test("renders unknown languages as plaintext + emits a warn (warn-and-degrade)", async () => {
    // Production deploys can't fail on a single unknown fence — render as
    // plaintext and emit a build-time warn instead. CLAUDE.md's strict-build
    // principle still applies for frontmatter/slugs/redirects, but not here.
    const element = await CodeBlock({ language: "totally-made-up", children: "x" });
    const html = await renderCodeBlock(element);
    expect(html).toContain('class="shiki');
    expect(html).toContain("totally-made-up");
  });

  test("renders plaintext when explicitly requested via `plaintext`/`text` alias", async () => {
    const element = await CodeBlock({
      language: "plaintext",
      children: "no highlighting wanted here",
    });
    const html = await renderCodeBlock(element);

    expect(html).toContain('class="shiki');
    expect(html).toContain("no highlighting wanted here");
  });

  test("emits no client highlighter script tags", async () => {
    const element = await CodeBlock({
      language: "javascript",
      children: "const x = 1;",
    });
    const html = await renderCodeBlock(element);

    expect(html).not.toContain("<script");
    expect(html).not.toContain("react-syntax-highlighter");
    expect(html).not.toContain("token keyword");
  });
});
