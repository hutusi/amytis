import { describe, expect, test } from "bun:test";
import { getAllPosts, getPostBySlug } from "../../src/lib/markdown";

describe("Integration: Reading Time & Headings", () => {
  test("posts have readingTime matching expected format", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);

    posts.forEach((post) => {
      expect(post.readingTime).toMatch(/^\d+ min read$/);
    });
  });

  test("kitchen-sink post has readingTime in correct format", () => {
    const post = getPostBySlug("kitchen-sink");
    if (!post) {
      console.warn("Skipping: kitchen-sink post not found");
      return;
    }
    expect(post.readingTime).toMatch(/^\d+ min read$/);
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

  test("short posts have 1 min read", () => {
    const posts = getAllPosts();
    // Find a short post (content < 200 words)
    const shortPost = posts.find((p) => {
      const wordCount = p.content.split(/\s+/).length;
      return wordCount < 200;
    });

    if (shortPost) {
      expect(shortPost.readingTime).toBe("1 min read");
    }
  });

  test("multilingual post has headings with correct IDs", () => {
    const post = getPostBySlug("multilingual-test");
    if (!post) {
      console.warn("Skipping: multilingual-test post not found");
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
