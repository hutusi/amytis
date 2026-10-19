import { describe, expect, test } from "bun:test";
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { renderAsync } from '@/test-utils/render';
import { extractContentMetrics } from '@/lib/text-metrics';
import type { SlugRegistryEntry } from '@/lib/content/discovery';
import { getAllPosts, getPostBySlug } from '../../src/lib/content/posts';

describe("Integration: Reading Time & Headings", () => {
  test("posts have a positive whole-minute readingMinutes", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);

    posts.forEach((post) => {
      expect(Number.isInteger(post.readingMinutes)).toBe(true);
      expect(post.readingMinutes).toBeGreaterThanOrEqual(1);
    });
  });

  test("kitchen-sink post has a positive readingMinutes", () => {
    const post = getPostBySlug("kitchen-sink");
    if (!post) {
      console.warn("Skipping: kitchen-sink post not found");
      return;
    }
    expect(Number.isInteger(post.readingMinutes)).toBe(true);
    expect(post.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  test("headings on real posts have correct structure", () => {
    const posts = getAllPosts();
    const postsWithHeadings = posts.filter((p) => p.headings.length > 0);

    expect(postsWithHeadings.length).toBeGreaterThan(0);

    postsWithHeadings.forEach((post) => {
      post.headings.forEach((heading) => {
        expect(heading).toHaveProperty("id");
        expect(heading).toHaveProperty("text");
        expect(heading).toHaveProperty("level");
        expect(typeof heading.id).toBe("string");
        expect(typeof heading.text).toBe("string");
        expect(heading.id.length).toBeGreaterThan(0);
        expect(heading.text.length).toBeGreaterThan(0);
      });
    });
  });

  test("no H1 headings appear in extracted results", () => {
    const posts = getAllPosts();
    posts.forEach((post) => {
      post.headings.forEach((heading) => {
        expect(heading.level).toBeGreaterThanOrEqual(2);
        expect(heading.level).toBeLessThanOrEqual(3);
      });
    });
  });

  test("short posts have readingMinutes === 1 (floor)", () => {
    const shortPost = getPostBySlug("legacy-markdown");
    expect(shortPost).toBeDefined();
    if (!shortPost) {
      throw new Error("fixture 'legacy-markdown' not found");
    }
    expect(shortPost.readingMinutes).toBe(1);
  });

  test("multilingual post has headings with correct IDs", () => {
    const post = getPostBySlug("multilingual-test-中文长标题");
    if (!post) {
      console.warn("Skipping: multilingual-test-中文长标题 post not found");
      return;
    }

    expect(post.headings.length).toBeGreaterThan(0);
    // All heading IDs should be non-empty strings
    post.headings.forEach((h) => {
      expect(h.id).toBeTruthy();
      expect(typeof h.id).toBe("string");
    });
  });
});

describe("Integration: TOC ids match rendered heading ids", () => {
  // Every TOC entry must point at an id the rendered page actually has, in
  // document order — otherwise the link goes nowhere and active-heading
  // tracking silently breaks.
  function renderedHeadingIds(html: string): string[] {
    return [...html.matchAll(/<h[1-6][^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  }

  function expectSubsequence(tocIds: string[], pageIds: string[]) {
    let cursor = 0;
    for (const id of tocIds) {
      const found = pageIds.indexOf(id, cursor);
      expect({ id, found: found !== -1 }).toEqual({ id, found: true });
      cursor = found + 1;
    }
  }

  test("tricky heading syntax keeps TOC and page in sync", async () => {
    const content = [
      "# Title",
      "",
      "## Title",
      "",
      "## [Link](http://x.com) text",
      "",
      "## Setup ##",
      "",
      "#### Setup",
      "",
      "### Setup",
      "",
      "## Install <span>inline</span> html",
      "",
      "Setext heading",
      "--------------",
      "",
      "```md",
      "## not a heading",
      "```",
    ].join("\n");
    const { contentWithoutH1, headings } = extractContentMetrics(content);
    const html = await renderAsync(MarkdownRenderer({ content: contentWithoutH1 }));
    const pageIds = renderedHeadingIds(html);
    expect(headings.length).toBe(6);
    expectSubsequence(headings.map((h) => h.id), pageIds);
  });

  test("wikilink headings get the TOC id with and without a wikilink registry", async () => {
    // Static pages and book chapters render without a registry (wikilinks
    // stay literal text); posts and notes resolve them. The id must not
    // depend on which surface renders the heading.
    const content = "## About [[some-note|My Note]]\n\nBody\n\n## See [[other-note]]";
    const { headings } = extractContentMetrics(content);
    const registry = new Map<string, SlugRegistryEntry>([
      ["some-note", { url: "/notes/some-note", title: "Some Note", type: "note" }],
      ["other-note", { url: "/notes/other-note", title: "Other Note Title", type: "note" }],
    ]);
    const withoutRegistry = renderedHeadingIds(await renderAsync(MarkdownRenderer({ content })));
    const withRegistry = renderedHeadingIds(await renderAsync(MarkdownRenderer({ content, slugRegistry: registry })));
    expect(headings.map((h) => h.id)).toEqual(["about-my-note", "see-other-note"]);
    expect(withoutRegistry).toEqual(["about-my-note", "see-other-note"]);
    expect(withRegistry).toEqual(["about-my-note", "see-other-note"]);
  });

  test("raw-HTML headings get ids that never collide with Markdown heading ids", async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: "## Setup\n\n<h2>Setup</h2>\n\n## Setup\n\n<h3>Raw only</h3>" }),
    );
    const ids = renderedHeadingIds(html);
    // Markdown headings keep the TOC's ids; raw ones take the next free slug.
    expect(ids).toEqual(["setup", "setup-2", "setup-1", "raw-only"]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(extractContentMetrics("## Setup\n\n<h2>Setup</h2>\n\n## Setup").headings.map((h) => h.id)).toEqual(["setup", "setup-1"]);
  });

  test("the flow stream's heading id prefix applies to Markdown headings", async () => {
    const html = await renderAsync(MarkdownRenderer({ content: "## Setup", headingIdPrefix: "2026-01-15-" }));
    expect(renderedHeadingIds(html)).toEqual(["2026-01-15-setup"]);
  });

  test("every Markdown post's TOC ids exist in its rendered body", async () => {
    const posts = getAllPosts().filter((p) => p.sourceFormat !== "rst" && p.headings.length > 0);
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      const html = await renderAsync(
        MarkdownRenderer({ content: post.content, latex: post.latex, slug: post.imageBaseSlug }),
      );
      expectSubsequence(post.headings.map((h) => h.id), renderedHeadingIds(html));
    }
  }, 60_000);
});
