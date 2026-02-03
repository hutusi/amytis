import { describe, expect, test } from "bun:test";
import {
  getAllSeries,
  getSeriesData,
  getSeriesPosts,
  getFeaturedPosts,
  getFeaturedSeries,
} from "../../src/lib/markdown";

describe("Integration: Series", () => {
  test("getAllSeries returns non-empty record with known slugs", () => {
    const series = getAllSeries();
    expect(Object.keys(series).length).toBeGreaterThan(0);
    expect(series).toHaveProperty("nextjs-deep-dive");
    expect(series).toHaveProperty("algorithm-adventures");
  });

  test("getSeriesData returns metadata with correct fields", () => {
    const data = getSeriesData("nextjs-deep-dive");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Next.js Deep Dive");
    expect(data!.sort).toBe("manual");
    expect(data!.posts).toBeDefined();
    expect(Array.isArray(data!.posts)).toBe(true);
    expect(data!.posts!.length).toBeGreaterThan(0);
  });

  test("getSeriesData returns null for nonexistent slug", () => {
    const data = getSeriesData("nonexistent-series-slug");
    expect(data).toBeNull();
  });

  test("getSeriesPosts returns posts in manual order for manual series", () => {
    const seriesData = getSeriesData("nextjs-deep-dive");
    expect(seriesData?.sort).toBe("manual");

    const posts = getSeriesPosts("nextjs-deep-dive");
    expect(posts.length).toBeGreaterThan(0);

    // Manual order should match the posts array in series metadata
    const manualSlugs = seriesData!.posts!;
    posts.forEach((post, i) => {
      expect(post.slug).toBe(manualSlugs[i]);
    });
  });

  test("getSeriesPosts returns posts sorted by date for date-asc series", () => {
    const seriesData = getSeriesData("algorithm-adventures");
    expect(seriesData?.sort).toBe("date-asc");

    const posts = getSeriesPosts("algorithm-adventures");
    // If there are at least 2 posts, verify ascending date order
    if (posts.length >= 2) {
      for (let i = 1; i < posts.length; i++) {
        expect(posts[i].date >= posts[i - 1].date).toBe(true);
      }
    }
  });

  test("getSeriesPosts returns empty array for nonexistent series", () => {
    const posts = getSeriesPosts("nonexistent-series-slug");
    expect(posts).toEqual([]);
  });

  test("getFeaturedPosts returns only posts with featured: true", () => {
    const featured = getFeaturedPosts();
    featured.forEach((post) => {
      expect(post.featured).toBe(true);
    });
  });

  test("getFeaturedSeries returns only series with featured: true in metadata", () => {
    const featured = getFeaturedSeries();
    Object.keys(featured).forEach((slug) => {
      const data = getSeriesData(slug);
      expect(data?.featured).toBe(true);
    });
  });
});
