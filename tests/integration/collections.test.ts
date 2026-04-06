import { describe, expect, test } from "bun:test";
import {
  getSeriesData,
  getCollectionPosts,
  getCollectionsForPost,
  getAllSeries,
} from "../../src/lib/markdown";

describe("Integration: Collections", () => {
  // ── getSeriesData ───────────────────────────────────────────────

  test("collection series data has type: collection", () => {
    const data = getSeriesData("modern-web-dev");
    expect(data).not.toBeNull();
    expect(data!.type).toBe("collection");
  });

  test("collection series data has items array", () => {
    const data = getSeriesData("modern-web-dev");
    expect(Array.isArray(data!.items)).toBe(true);
    expect(data!.items!.length).toBeGreaterThan(0);
  });

  test("collection items contain expected post and series entries", () => {
    const data = getSeriesData("modern-web-dev");
    const items = data!.items!;
    const postItems = items.filter((i) => "post" in i);
    const seriesItems = items.filter((i) => "series" in i);
    expect(postItems.length).toBeGreaterThan(0);
    expect(seriesItems.length).toBeGreaterThan(0);
  });

  // ── getCollectionPosts ──────────────────────────────────────────

  test("getCollectionPosts returns posts from all sources", () => {
    const posts = getCollectionPosts("modern-web-dev");
    expect(posts.length).toBeGreaterThan(0);
  });

  test("getCollectionPosts resolves standalone post entries", () => {
    const posts = getCollectionPosts("modern-web-dev");
    const slugs = posts.map((p) => p.slug);
    expect(slugs).toContain("asynchronous-javascript");
    expect(slugs).toContain("understanding-react-hooks");
  });

  test("getCollectionPosts resolves namespaced post entries properly", () => {
    // The modern-web-dev collection uses the "posts/asynchronous-javascript" syntax.
    // This test ensures that the namespaced resolution logic successfully found it.
    const posts = getCollectionPosts("modern-web-dev");
    const foundPost = posts.find(p => p.slug === "asynchronous-javascript");
    expect(foundPost).toBeDefined();
    // Because the namespace was "posts/", its series should be undefined
    expect(foundPost!.series).toBeUndefined();
  });

  test("getCollectionPosts includes posts from referenced series", () => {
    const posts = getCollectionPosts("modern-web-dev");
    const slugs = posts.map((p) => p.slug);
    // nextjs-deep-dive posts should be included
    expect(slugs).toContain("01-getting-started");
    expect(slugs).toContain("02-routing-mastery");
  });

  test("getCollectionPosts preserves item order", () => {
    const posts = getCollectionPosts("modern-web-dev");
    const slugs = posts.map((p) => p.slug);
    // standalone posts come before the series items in the frontmatter
    expect(slugs.indexOf("asynchronous-javascript")).toBeLessThan(
      slugs.indexOf("01-getting-started")
    );
    expect(slugs.indexOf("understanding-react-hooks")).toBeLessThan(
      slugs.indexOf("01-getting-started")
    );
  });

  test("getCollectionPosts returns empty array for non-collection series", () => {
    // Regular series should return empty — use getSeriesPosts for those
    const posts = getCollectionPosts("nextjs-deep-dive");
    expect(posts).toEqual([]);
  });

  test("getCollectionPosts returns empty array for nonexistent slug", () => {
    const posts = getCollectionPosts("nonexistent-collection");
    expect(posts).toEqual([]);
  });

  // ── getCollectionsForPost ───────────────────────────────────────

  test("getCollectionsForPost finds collection for standalone post", () => {
    const collections = getCollectionsForPost("asynchronous-javascript");
    const slugs = collections.map((c) => c.slug);
    expect(slugs).toContain("modern-web-dev");
  });

  test("getCollectionsForPost finds collection for series post", () => {
    const collections = getCollectionsForPost("01-getting-started");
    const slugs = collections.map((c) => c.slug);
    expect(slugs).toContain("modern-web-dev");
  });

  test("getCollectionsForPost returns empty array for post not in any collection", () => {
    const collections = getCollectionsForPost("welcome-to-amytis");
    expect(collections).toEqual([]);
  });

  test("getCollectionsForPost collection entry includes slug, title, and posts", () => {
    const collections = getCollectionsForPost("asynchronous-javascript");
    const col = collections.find((c) => c.slug === "modern-web-dev")!;
    expect(col).toBeDefined();
    expect(typeof col.title).toBe("string");
    expect(Array.isArray(col.posts)).toBe(true);
    expect(col.posts.length).toBeGreaterThan(0);
  });

  // ── getAllSeries ────────────────────────────────────────────────

  test("getAllSeries includes collection with correct post count", () => {
    const all = getAllSeries();
    expect(all).toHaveProperty("modern-web-dev");
    // modern-web-dev has 2 standalone posts + 4 from nextjs-deep-dive
    expect(all["modern-web-dev"].length).toBe(6);
  });

  test("getAllSeries collection posts are sorted by date descending", () => {
    const posts = getAllSeries()["modern-web-dev"];
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].date >= posts[i].date).toBe(true);
    }
  });

  test("getAllSeries collection contains same posts as getCollectionPosts", () => {
    const all = getAllSeries();
    const direct = getCollectionPosts("modern-web-dev");
    expect(all["modern-web-dev"].map((p) => p.slug).sort()).toEqual(
      direct.map((p) => p.slug).sort()
    );
  });
});
