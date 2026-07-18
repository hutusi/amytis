import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { getSeriesContentEntries } from "../../src/lib/content/series-metadata";
import { parseRstDocument, RstParseError } from "../../src/lib/rst";
import { getAdjacentPosts } from '../../src/lib/content/related';
import { getAllSeries, getSeriesData, getSeriesLatestPostDate, getSeriesPosts, getFeaturedSeries, toPostNavItems } from '../../src/lib/content/series';
import { getFeaturedPosts, getPostBySlug } from '../../src/lib/content/posts';

describe("Integration: Series", () => {
  test("toPostNavItems projects nav fields only — no article bodies cross to the client", () => {
    const withPosts = Object.values(getAllSeries()).find(posts => posts.length > 0);
    expect(withPosts).toBeDefined();
    const nav = toPostNavItems(withPosts!);
    expect(nav.length).toBe(withPosts!.length);
    for (let i = 0; i < nav.length; i++) {
      const item = nav[i];
      expect(new Set(Object.keys(item))).toEqual(new Set(['slug', 'title', 'date', 'series']));
      expect(item.slug).toBe(withPosts![i].slug);
      // The heavy fields that inflate the RSC payload must be absent.
      expect('content' in item).toBe(false);
      expect('renderedHtml' in item).toBe(false);
      expect('plainText' in item).toBe(false);
      expect('headings' in item).toBe(false);
    }
  });

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

  test("getSeriesLatestPostDate uses the newest post date instead of manual series order", () => {
    expect(getSeriesData("nextjs-deep-dive")?.sort).toBe("manual");
    expect(getSeriesPosts("nextjs-deep-dive").map(post => post.date)).toEqual(["2026-01-30", "2026-01-31"]);
    expect(getSeriesLatestPostDate("nextjs-deep-dive")).toBe("2026-01-31");
  });

  test("getAdjacentPosts follows rST series order instead of global post date order", () => {
    const first = getAdjacentPosts(getPostBySlug("getting-started")!);
    expect(first.prev?.slug ?? null).toBeNull();
    expect(first.next?.slug).toBe("deeper-notes");

    const second = getAdjacentPosts(getPostBySlug("deeper-notes")!);
    expect(second.prev?.slug).toBe("getting-started");
    expect(second.next?.slug ?? null).toBeNull();
  });

  test("getAdjacentPosts resolves neighbours within the correct series for a duplicate slug", () => {
    // first-post exists in both rst-toctree and rst-toctree-precedence. Passing
    // the resolved post (not a bare slug) must keep neighbours inside its own
    // series — a global bare-slug lookup would cross into the other series.
    const toctreeFirst = getSeriesPosts("rst-toctree").find(p => p.slug === "first-post")!;
    const adj = getAdjacentPosts(toctreeFirst);
    for (const neighbour of [adj.prev, adj.next]) {
      if (neighbour) expect(neighbour.series).toBe("rst-toctree");
    }
    // rst-toctree lists second-post then first-post, so first-post's prev is
    // the rst-toctree second-post and it has no next.
    expect(adj.prev?.slug).toBe("second-post");
    expect(adj.prev?.series).toBe("rst-toctree");
    expect(adj.next).toBeNull();
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

describe("Integration: series format invariants", () => {
  test("a series mixing rST and Markdown posts throws at build time", () => {
    // Strict-build invariant: mixed-format series must fail the export.
    const slug = "__test-mixed-format__";
    const seriesDir = path.join(process.cwd(), "content", "series", slug);
    fs.mkdirSync(seriesDir, { recursive: true });
    fs.writeFileSync(
      path.join(seriesDir, "index.mdx"),
      ["---", 'title: "Mixed Series"', "---", "", "Index", ""].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(seriesDir, "stray.rst"),
      ["Stray rST Post", "**************", "", "Body", ""].join("\n"),
      "utf8",
    );

    try {
      expect(() => getSeriesContentEntries(slug)).toThrow(/mixes markdown and rst files/);
    } finally {
      fs.rmSync(seriesDir, { recursive: true, force: true });
    }
  });
});
