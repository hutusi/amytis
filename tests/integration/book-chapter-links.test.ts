import { describe, expect, test } from "bun:test";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { renderAsync } from "@/test-utils/render";
import path from "path";

const fixtureBookDir = path.resolve("tests/fixtures/book-chapter-links");
const chapterSourcePath = path.join(fixtureBookDir, "maths/linear/introduction.md");

const bookContext = {
  bookSlug: "dmla",
  bookDir: fixtureBookDir,
  chapterSourcePath,
  validChapterIds: new Set([
    "maths/linear/introduction",
    "maths/linear/vectors",
    "maths/linear/matrices",
    "deep-learning/perceptron",
  ]),
};

describe("Integration: remark-book-chapter-links", () => {
  test("rewrites a relative sibling .md link to its canonical chapter URL", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "See [vectors](vectors.md) for details.",
        bookContext,
      }),
    );
    expect(html).toContain('href="/books/dmla/maths/linear/vectors"');
    expect(html).not.toContain('href="vectors.md"');
  });

  test("preserves fragment anchors when rewriting", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "See [tensors](matrices.md#tensors).",
        bookContext,
      }),
    );
    expect(html).toContain('href="/books/dmla/maths/linear/matrices#tensors"');
  });

  test("rewrites a parent-directory .md link", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "See [perceptron](../../deep-learning/perceptron.md).",
        bookContext,
      }),
    );
    expect(html).toContain('href="/books/dmla/deep-learning/perceptron"');
  });

  test("leaves external http links untouched", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "See [Wiki](https://en.wikipedia.org/wiki/Vector_space).",
        bookContext,
      }),
    );
    expect(html).toContain('href="https://en.wikipedia.org/wiki/Vector_space"');
  });

  test("leaves hash-only links untouched", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "[Top](#top)",
        bookContext,
      }),
    );
    expect(html).toContain('href="#top"');
  });

  test("warns and leaves the link unrewritten when target is not in the TOC", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "Broken [link](nonexistent.md).",
        bookContext,
      }),
    );
    // The unmatched link is kept as-is — it will 404 if clicked, but doesn't
    // block the build. Matches the Shiki "unknown language → warn" precedent.
    expect(html).toContain('href="nonexistent.md"');
  });

  test("malformed percent-encoding in a link does not crash the render", async () => {
    // `%E0%A4%A` is a truncated UTF-8 sequence — bare decodeURIComponent throws
    // URIError on this. The plugin must swallow that and not blow up the build.
    const html = await renderAsync(
      MarkdownRenderer({
        content: "Sketchy [link](%E0%A4%A.md).",
        bookContext,
      }),
    );
    // Either the link survives as-is or it's silently dropped — what matters
    // is that we don't get an unhandled URIError tearing down the render.
    expect(html).toContain("Sketchy");
  });

  test("non-book content (no bookContext) is not rewritten", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: "See [vectors](vectors.md).",
      }),
    );
    expect(html).toContain('href="vectors.md"');
  });
});
