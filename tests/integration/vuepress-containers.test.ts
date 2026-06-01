import { describe, expect, test } from "bun:test";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { renderAsync } from "@/test-utils/render";

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
});
