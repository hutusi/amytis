import { describe, expect, test } from "bun:test";
import { getAllPosts, getPostBySlug } from "../../src/lib/markdown";

describe("Integration: Posts", () => {
  test("should load all posts from content directory", () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThan(0);
    
    // Check if pagination config works with real data count
    // (Optional, just checking we have data)
  });

  test("should load a specific post by slug", () => {
    const posts = getAllPosts();
    if (posts.length > 0) {
      const slug = posts[0].slug;
      const post = getPostBySlug(slug);
      expect(post).not.toBeNull();
      expect(post?.slug).toBe(slug);
    }
  });

  test("should have valid metadata for all posts", () => {
    const posts = getAllPosts();
    posts.forEach(post => {
      expect(post.title).toBeDefined();
      expect(post.date).toBeDefined();
      expect(post.authors.length).toBeGreaterThan(0);
    });
  });
});
