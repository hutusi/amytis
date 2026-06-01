import { describe, expect, test } from "bun:test";
import { normalizeVuepressBlockMath } from "../../src/lib/normalize-vuepress-math";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { renderAsync } from "@/test-utils/render";

describe("Integration: normalizeVuepressBlockMath", () => {
  test("splits an inline-style $$ opener+closer onto their own lines", () => {
    const src = [
      "$$ \\mathbf{A} = \\begin{bmatrix}",
      "a & b \\\\",
      "c & d",
      "\\end{bmatrix} $$",
    ].join("\n");
    const out = normalizeVuepressBlockMath(src);
    expect(out.split("\n")).toEqual([
      "$$",
      "\\mathbf{A} = \\begin{bmatrix}",
      "a & b \\\\",
      "c & d",
      "\\end{bmatrix}",
      "$$",
    ]);
  });

  test("leaves a single-line $$ x $$ block alone", () => {
    const src = "$$ x^2 + y^2 = 1 $$";
    expect(normalizeVuepressBlockMath(src)).toBe(src);
  });

  test("does not touch inline $...$ math", () => {
    const src = "An equation: $x = 1$ in the middle of a paragraph.";
    expect(normalizeVuepressBlockMath(src)).toBe(src);
  });

  test("is idempotent — already-normalized blocks pass through unchanged", () => {
    const src = ["$$", "x = 1", "$$"].join("\n");
    expect(normalizeVuepressBlockMath(src)).toBe(src);
    expect(normalizeVuepressBlockMath(normalizeVuepressBlockMath(src))).toBe(src);
  });

  test("skips $$ inside fenced code blocks (doc examples)", () => {
    const src = [
      "Here is the source:",
      "",
      "```",
      "$$ \\mathbf{A} = \\begin{bmatrix} a \\end{bmatrix} $$",
      "```",
      "",
      "Real math follows:",
      "",
      "$$ y = mx + b $$",
    ].join("\n");
    const out = normalizeVuepressBlockMath(src);
    // The code-block example is preserved verbatim — no split.
    expect(out).toContain("$$ \\mathbf{A} = \\begin{bmatrix} a \\end{bmatrix} $$");
    // The real single-line block math after the fence is also untouched.
    expect(out).toContain("$$ y = mx + b $$");
  });

  test("preserves opener indent on split lines for list-nested block math", () => {
    // A 4-space-indented block inside a bullet item. Without indent
    // preservation, the split body lines drop out of the list and the
    // following inline math gets parsed as one big malformed math span.
    const src = [
      "- Item with embedded math:",
      "",
      "    $$\\mathbf{A} = \\begin{bmatrix}",
      "    a & b",
      "    \\end{bmatrix}$$",
      "",
      "- Next item with inline math: $\\mathbf{X}$, comma here.",
    ].join("\n");
    const out = normalizeVuepressBlockMath(src);
    // Synthetic opener line carries the original 4-space indent so it stays
    // inside the list item.
    expect(out).toContain("    $$\n    \\mathbf{A}");
    // Closer's `$$` likewise stays indented.
    expect(out).toContain("    \\end{bmatrix}\n    $$");
  });

  test("handles multiple block-math runs in the same source", () => {
    const src = [
      "$$ a = 1",
      "b = 2 $$",
      "",
      "Some prose.",
      "",
      "$$ c = 3",
      "d = 4 $$",
    ].join("\n");
    const out = normalizeVuepressBlockMath(src);
    // Both runs split, prose preserved.
    expect(out.split(/^\$\$$/m).length).toBeGreaterThanOrEqual(5);
    expect(out).toContain("Some prose.");
  });
});

describe("Integration: end-to-end LaTeX rendering for VuePress-style block math", () => {
  test("a multi-line bmatrix block renders as a katex-display, not katex-error", async () => {
    const html = await renderAsync(
      MarkdownRenderer({
        content: [
          "$$ \\mathbf{A} = \\begin{bmatrix}",
          "a & b \\\\",
          "c & d",
          "\\end{bmatrix} $$",
        ].join("\n"),
        latex: true,
      }),
    );
    expect(html).toContain("katex-display");
    expect(html).not.toContain("katex-error");
  });

  test("normalization only runs when latex is true (idempotent so this is a perf hint)", async () => {
    // With latex disabled, the math fences are passed through unchanged
    // to ReactMarkdown — same input the engine would have always seen.
    // We just verify the page renders without crashing.
    const html = await renderAsync(
      MarkdownRenderer({
        content: "$$ x $$",
        latex: false,
      }),
    );
    expect(html).toContain("$$"); // not turned into math because latex was off
  });
});
