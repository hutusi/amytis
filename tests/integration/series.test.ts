import { describe, expect, test } from "bun:test";
import { parseRstDocument, RstParseError } from "../../src/lib/rst";
import {
  getAllSeries,
  getAdjacentPosts,
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
    expect(series).toHaveProperty("digital-garden");
    expect(series).toHaveProperty("rst-legacy");
    expect(series).toHaveProperty("rst-readme");
    expect(series).toHaveProperty("rst-toctree");
    expect(series).toHaveProperty("rst-toctree-precedence");
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

  test("getSeriesData loads rST series metadata", () => {
    const data = getSeriesData("rst-legacy");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Rst Legacy Series");
    expect(data!.sourceFormat).toBe("rst");
    expect(data!.sort).toBe("manual");
    expect(data!.posts).toEqual(["getting-started", "deeper-notes"]);
  });

  test("getSeriesData accepts README.rst as the series index", () => {
    const data = getSeriesData("rst-readme");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Rst README Series");
    expect(data!.sourceFormat).toBe("rst");
    expect(data!.posts).toEqual(["readme-index-post"]);
  });

  test("getSeriesData derives manual order from rST toctree when posts metadata is absent", () => {
    const data = getSeriesData("rst-toctree");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Rst Toctree Series");
    expect(data!.sourceFormat).toBe("rst");
    expect(data!.sort).toBe("manual");
    expect(data!.posts).toEqual(["second-post", "first-post"]);
  });

  test("getSeriesData rejects unsafe series slugs", () => {
    expect(() => getSeriesData("../etc/passwd")).toThrow();
    expect(() => getSeriesData("nested/slug")).toThrow();
  });

  test("rST series indexes reject impossible dates", () => {
    expect(() => parseRstDocument([
      "Broken rST Series",
      "=================",
      "",
      ":date: 2021-16-15",
      "",
      "Body.",
      "",
    ].join("\n"))).toThrow(RstParseError);
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

  test("getSeriesPosts returns posts in manual order for digital-garden series", () => {
    const seriesData = getSeriesData("digital-garden");
    expect(seriesData?.sort).toBe("manual");

    const posts = getSeriesPosts("digital-garden");
    expect(posts.length).toBeGreaterThan(0);

    const manualSlugs = seriesData!.posts!;
    posts.forEach((post, i) => {
      expect(post.slug).toBe(manualSlugs[i]);
    });
  });

  test("getSeriesPosts returns empty array for nonexistent series", () => {
    const posts = getSeriesPosts("nonexistent-series-slug");
    expect(posts).toEqual([]);
  });

  test("getSeriesPosts returns rST posts in manual order", () => {
    const posts = getSeriesPosts("rst-legacy");
    expect(posts.map(post => post.slug)).toEqual(["getting-started", "deeper-notes"]);
    expect(posts.every(post => post.sourceFormat === "rst")).toBe(true);
  });

  test("getSeriesPosts loads posts for README.rst-based series", () => {
    const posts = getSeriesPosts("rst-readme");
    expect(posts.map(post => post.slug)).toEqual(["readme-index-post"]);
    expect(posts[0]?.sourceFormat).toBe("rst");
  });

  test("getSeriesPosts follows rST toctree order when posts metadata is absent", () => {
    const posts = getSeriesPosts("rst-toctree");
    expect(posts.map(post => post.slug)).toEqual(["second-post", "first-post"]);
    expect(posts.every(post => post.sourceFormat === "rst")).toBe(true);
  });

  test("getAdjacentPosts follows rST series order instead of global post date order", () => {
    const first = getAdjacentPosts("second-post");
    expect(first.prev?.slug ?? null).toBeNull();
    expect(first.next?.slug).toBe("first-post");

    const second = getAdjacentPosts("first-post");
    expect(second.prev?.slug).toBe("second-post");
    expect(second.next?.slug ?? null).toBeNull();
  });

  test("explicit rST posts metadata takes precedence over toctree order", () => {
    const data = getSeriesData("rst-toctree-precedence");
    expect(data).not.toBeNull();
    expect(data!.posts).toEqual(["first-post", "second-post"]);

    const posts = getSeriesPosts("rst-toctree-precedence");
    expect(posts.map(post => post.slug)).toEqual(["first-post", "second-post"]);
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

  test("getFeaturedSeries is a subset of getAllSeries", () => {
    const all = getAllSeries();
    const featured = getFeaturedSeries();
    expect(Object.keys(featured).length).toBeLessThanOrEqual(Object.keys(all).length);
    Object.keys(featured).forEach((slug) => {
      expect(all).toHaveProperty(slug);
    });
  });
});
