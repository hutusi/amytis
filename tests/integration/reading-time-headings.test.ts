import { describe, expect, test } from "bun:test";
import { getAllPosts, getPostBySlug } from "../../src/lib/markdown";

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
