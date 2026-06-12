import { describe, expect, test } from "bun:test";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { renderAsync } from "@/test-utils/render";
import { normalizeVuepressContainerSyntax } from "@/lib/remark-vuepress-containers";

describe("Integration: VuePress :::container alerts", () => {
  test(":::note renders as a note GitHub Alert", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "::: note\n\nBody text\n:::" }),
    );
    expect(html).toContain('class="alert alert-note"');
    expect(html).toContain("Body text");
  });

  test(":::tip preserves a custom title", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "::: tip 智慧的疆界\n\nBody\n:::" }),
    );
    expect(html).toContain('class="alert alert-tip"');
    expect(html).toContain("智慧的疆界");
    // The hardcoded default label should not appear when a custom title is given.
    expect(html).not.toMatch(/<span>Tip<\/span>/);
  });

  test(":::warning renders as a warning alert", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "::: warning\n\nWatch out\n:::" }),
    );
    expect(html).toContain('class="alert alert-warning"');
  });

  test(":::danger maps to caution (GitHub Alert vocabulary)", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "::: danger\n\nUnsafe\n:::" }),
    );
    expect(html).toContain('class="alert alert-caution"');
  });

  test(":::info maps to note", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "::: info\n\nFYI\n:::" }),
    );
    expect(html).toContain('class="alert alert-note"');
  });

  test("unknown container names pass through without becoming alerts", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "::: random\n\nSomething\n:::" }),
    );
    expect(html).not.toContain('class="alert');
  });

  test("plain content is not rewritten", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "Plain paragraph." }),
    );
    expect(html).not.toContain('class="alert');
  });

  test("VuePress syntax inside a fenced code block is NOT rewritten", async () => {
    // A documentation example showing VuePress syntax verbatim. The normalizer
    // must skip fenced regions; otherwise the code sample silently becomes the
    // syntax itself and the doc example breaks.
    const html = await renderAsync(
      MarkdownRenderer({
        content: [
          "Here is how to write a tip:",
          "",
          "```markdown",
          "::: tip 智慧的疆界",
          "Body of the tip.",
          ":::",
          "```",
          "",
          "And here is a real one:",
          "",
          "::: tip 真实的提示",
          "Hello",
          ":::",
        ].join("\n"),
      }),
    );
    // The code block keeps the relaxed `::: tip ...` form verbatim — no
    // `:::tip[...]` rewrite leaks through.
    expect(html).toContain("::: tip 智慧的疆界");
    expect(html).not.toContain(":::tip[智慧的疆界]");
    // The real container outside the code block still renders as an alert.
    expect(html).toContain('class="alert alert-tip"');
    expect(html).toContain("真实的提示");
  });

  test("no-space opener with a bare title (fenix style) renders an alert with the custom title", async () => {
    // VuePress also accepts `:::tip Some title` (no space after the colons).
    // remark-directive rejects bare text after the name, so without
    // normalization this line falls through as literal paragraph text.
    const html = await renderAsync(
      MarkdownRenderer({
        content: [
          ":::tip 无服务架构（Serverless）",
          "",
          "如果说微服务架构是分布式系统这条路的极致。",
          "",
          ":::",
        ].join("\n"),
      }),
    );
    expect(html).toContain('class="alert alert-tip"');
    expect(html).toContain("无服务架构（Serverless）");
    expect(html).toContain("如果说微服务架构是分布式系统这条路的极致。");
    expect(html).not.toContain(":::");
  });

  test("normalizer rewrites only the forms remark-directive cannot parse", () => {
    // Spaced forms (always rewritten)
    expect(normalizeVuepressContainerSyntax("::: tip Some Title")).toBe(":::tip[Some Title]");
    expect(normalizeVuepressContainerSyntax("::: warning")).toBe(":::warning");
    // No-space form with a bare title (rewritten — the fenix style)
    expect(normalizeVuepressContainerSyntax(":::tip 无服务架构（Serverless）"))
      .toBe(":::tip[无服务架构（Serverless）]");
    // Already-valid directive syntax (untouched)
    expect(normalizeVuepressContainerSyntax(":::code-group")).toBe(":::code-group");
    expect(normalizeVuepressContainerSyntax(":::tip")).toBe(":::tip");
    expect(normalizeVuepressContainerSyntax(":::tip[已有标题]")).toBe(":::tip[已有标题]");
    expect(normalizeVuepressContainerSyntax(":::tip{.classy}")).toBe(":::tip{.classy}");
    expect(normalizeVuepressContainerSyntax(":::")).toBe(":::");
  });

  test("fence character type matters (~~~ vs ```)", async () => {
    // A `~~~` fence isn't closed by a ``` line, so the container after the
    // ``` is still inside the open `~~~` fence and must NOT be rewritten.
    const html = await renderAsync(
      MarkdownRenderer({
        content: [
          "~~~",
          "::: tip Inside tilde fence",
          "```",
          "::: tip Still inside",
          "~~~",
        ].join("\n"),
      }),
    );
    expect(html).not.toContain('class="alert');
  });
});
