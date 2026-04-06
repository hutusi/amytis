import { describe, expect, test } from "bun:test";
import { getFeedItems } from "../../src/lib/feed-utils";
import { getAllPosts, getAllFlows } from "../../src/lib/markdown";
import { getPostUrl, getFlowUrl } from "../../src/lib/urls";
import { siteConfig } from "../../site.config";

describe("Integration: Feed Utils", () => {
  test("getFeedItems returns an array", () => {
    const items = getFeedItems();
    expect(Array.isArray(items)).toBe(true);
  });

  test("feed items have required fields", () => {
    const items = getFeedItems();
    items.forEach((item) => {
      expect(item.title).toBeDefined();
      expect(typeof item.url).toBe("string");
      expect(item.date).toBeInstanceOf(Date);
      expect(typeof item.excerpt).toBe("string");
      expect(typeof item.content).toBe("string");
      expect(Array.isArray(item.tags)).toBe(true);
    });
  });

  test("feed item URLs include the site baseUrl", () => {
    const items = getFeedItems();
    const baseUrl = siteConfig.baseUrl.replace(/\/+$/, "");
    items.forEach((item) => {
      expect(item.url.startsWith(baseUrl)).toBe(true);
    });
  });

  test("feed items are sorted by date descending", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems();
      for (let i = 1; i < items.length; i++) {
        expect(items[i - 1].date.getTime()).toBeGreaterThanOrEqual(
          items[i].date.getTime()
        );
      }
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("feed items have valid dates", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems();
      items.forEach((item) => {
        expect(Number.isNaN(item.date.getTime())).toBe(false);
      });
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("maxItems = 0 returns all posts", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    const originalIncludeFlows = siteConfig.feed.includeFlows;
    try {
      siteConfig.feed.maxItems = 0;
      siteConfig.feed.includeFlows = false;
      const items = getFeedItems();
      const allPosts = getAllPosts();
      expect(items.length).toBe(allPosts.length);
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
      siteConfig.feed.includeFlows = originalIncludeFlows;
    }
  });

  test("maxItems limits returned items", () => {
    const allPosts = getAllPosts();
    if (allPosts.length < 2) return; // skip if not enough content

    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 1;
      const items = getFeedItems();
      expect(items.length).toBe(1);
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("respects configured maxItems", () => {
    const items = getFeedItems();
    const { maxItems } = siteConfig.feed;
    if (maxItems > 0) {
      expect(items.length).toBeLessThanOrEqual(maxItems);
    }
  });

  test("includeFlows adds flow notes to the feed", () => {
    const flows = getAllFlows();
    if (flows.length === 0) return; // skip if no flow content exists

    const originalIncludeFlows = siteConfig.feed.includeFlows;
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;

      siteConfig.feed.includeFlows = false;
      const itemsWithout = getFeedItems();

      siteConfig.feed.includeFlows = true;
      const itemsWith = getFeedItems();

      expect(itemsWith.length).toBeGreaterThan(itemsWithout.length);
    } finally {
      siteConfig.feed.includeFlows = originalIncludeFlows;
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("flow items include /flows/ in their URL", () => {
    const flows = getAllFlows();
    if (flows.length === 0) return;

    const originalIncludeFlows = siteConfig.feed.includeFlows;
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.includeFlows = true;
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems();
      const flowItems = items.filter((item) => item.url.includes("/flows/"));
      expect(flowItems.length).toBe(flows.length);
    } finally {
      siteConfig.feed.includeFlows = originalIncludeFlows;
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("feed item content is rendered HTML, not raw Markdown", () => {
    const items = getFeedItems();
    items.forEach((item) => {
      if (item.content.trim().length === 0) return;
      // Rendered HTML must contain at least one HTML tag
      expect(item.content).toMatch(/<[a-z][^>]*>/i);
      // Markdown headings should not appear outside code blocks
      const strippedCodeBlocks = item.content.replace(/<pre[\s\S]*?<\/pre>/gi, '');
      expect(strippedCodeBlocks).not.toMatch(/^#{1,6}\s/m);
    });
  });

  test("feed items with authors have a non-empty authors array", () => {
    const items = getFeedItems();
    items.forEach((item) => {
      if (item.authors !== undefined) {
        expect(Array.isArray(item.authors)).toBe(true);
        expect(item.authors.length).toBeGreaterThan(0);
      }
    });
  });

  test("feedType 'posts' returns only post items", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems('posts');
      const allPosts = getAllPosts();
      const baseUrl = siteConfig.baseUrl.replace(/\/+$/, "");
      expect(items.length).toBe(allPosts.length);
      expect(items.map((item) => item.url).sort()).toEqual(
        allPosts.map((post) => `${baseUrl}${getPostUrl(post)}`).sort()
      );
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("feedType 'flows' returns only flow items", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems('flows');
      const allFlows = getAllFlows();
      const baseUrl = siteConfig.baseUrl.replace(/\/+$/, "");
      expect(items.length).toBe(allFlows.length);
      expect(items.map((item) => item.url).sort()).toEqual(
        allFlows.map((flow) => `${baseUrl}${getFlowUrl(flow.slug)}`).sort()
      );
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("feedType 'all' returns both post and flow items", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems('all');
      const allPosts = getAllPosts();
      const allFlows = getAllFlows();
      const baseUrl = siteConfig.baseUrl.replace(/\/+$/, "");
      expect(items.map((item) => item.url).sort()).toEqual(
        [
          ...allPosts.map((post) => `${baseUrl}${getPostUrl(post)}`),
          ...allFlows.map((flow) => `${baseUrl}${getFlowUrl(flow.slug)}`),
        ].sort()
      );
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });
});
