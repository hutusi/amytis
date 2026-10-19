import { describe, expect, test } from "bun:test";
import { getFeedItems } from "../../src/lib/feed-utils";
import { getAllPosts, getTwinPost } from '../../src/lib/content/posts';
import { getAllFlows } from '../../src/lib/content/flows';
import { getPostUrl, getFlowUrl, withTrailingSlash } from "../../src/lib/urls";
import { siteConfig } from "../../site.config";
import { markdownToHtml } from "../../src/lib/markdown-to-html";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import { visit } from "unist-util-visit";
import type { Element } from "hast";


// The post set feeds serve: the default tree plus locale-tree originals
// (posts with no default-tree twin) — mirrors getFeedPosts in feed-utils.
function feedPostsUnion() {
  return [
    ...getAllPosts(),
    ...['zh'].flatMap((locale) => getAllPosts(locale).filter((p) => !getTwinPost(p, 'en'))),
  ];
}

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
      const allPosts = feedPostsUnion();
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
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      // Must request full content explicitly — without it every item.content
      // is '' and the assertions below pass vacuously.
      const items = getFeedItems("all", true);
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        expect(item.content.trim().length).toBeGreaterThan(0);
        // Rendered HTML must contain at least one HTML tag
        expect(item.content).toMatch(/<[a-z][^>]*>/i);
        // Markdown headings should not appear outside code blocks
        const strippedCodeBlocks = item.content.replace(/<pre[\s\S]*?<\/pre>/gi, '');
        expect(strippedCodeBlocks).not.toMatch(/^#{1,6}\s/m);
      });
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  // The showcase fixtures document extended syntax inside code examples, so
  // fenced blocks and inline code are stripped before asserting on prose.
  // `<code(?![-\w])` avoids eating a stray unmapped `<code-group>` tag, which
  // must instead fail the synthetic-tag assertion below.
  const stripCodeIslands = (html: string) =>
    html
      .replace(/<pre[\s\S]*?<\/pre>/gi, '')
      .replace(/<code(?![-\w])(?:\s[^>]*)?>[\s\S]*?<\/code>/gi, '');

  test("extended syntax renders in full content instead of leaking as literal text", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems("all", true);
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item) => {
        const prose = stripCodeIslands(item.content);
        // ::: container openers/closers must be consumed by remark-directive.
        // Substring, not line-anchored: a leaked opener renders mid-line as
        // <p>:::code-group</p>.
        expect(prose).not.toContain(':::');
        // GitHub alert markers must be transformed, not shown
        expect(prose).not.toMatch(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
        // Wikilinks must resolve to anchors (or broken-link spans)
        expect(prose).not.toContain('[[');
        // Synthetic React-only tags must be mapped to plain HTML
        expect(item.content).not.toContain('<github-alert');
        expect(item.content).not.toContain('<code-group');
      });
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("alerts and code groups render as plain semantic HTML in full content", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems("posts", true);
      const showcase = items.find((i) => i.url.includes("code-block-features-showcase"));
      expect(showcase).toBeDefined();
      // > [!NOTE] alerts become titled blockquotes
      expect(showcase!.content).toContain("<blockquote");
      // :::code-group panels survive as <pre> blocks
      expect(showcase!.content).toContain("<pre");
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("wikilinks resolve to anchors in full-content flow items", () => {
    const flows = getAllFlows();
    if (!flows.some((f) => /\[\[[^\]]+\]\]/.test(f.content))) return; // skip without fixtures

    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const items = getFeedItems("flows", true);
      const withWikilink = items.filter((i) => i.content.includes('class="wikilink'));
      expect(withWikilink.length).toBeGreaterThan(0);
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  test("math posts carry MathML in full content", () => {
    const mathPost = getAllPosts().find((p) => p.latex && p.sourceFormat !== "rst");
    if (!mathPost) return; // skip without fixtures

    const originalMaxItems = siteConfig.feed.maxItems;
    try {
      siteConfig.feed.maxItems = 0;
      const url = withTrailingSlash(siteConfig.baseUrl.replace(/\/+$/, "") + getPostUrl(mathPost));
      const item = getFeedItems("posts", true).find((i) => i.url === url);
      expect(item).toBeDefined();
      expect(item!.content).toContain("<math");
      // TeX sources must not leak as $-delimited literals outside code
      expect(stripCodeIslands(item!.content)).not.toMatch(/\$\$/);
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });

  // Inspect real element attributes: serialized code samples legitimately
  // contain text like `src="audio.ogg"`, which must stay as written.
  function elementUrls(html: string): { tag: string; attr: string; url: string }[] {
    const urls: { tag: string; attr: string; url: string }[] = [];
    visit(unified().use(rehypeParse, { fragment: true }).parse(html), "element", (node: Element) => {
      for (const attr of ["src", "href", "poster"]) {
        const url = node.properties?.[attr];
        if (typeof url === "string") urls.push({ tag: node.tagName, attr, url });
      }
    });
    return urls;
  }

  test("full-content items carry no relative src/href (feed readers resolve nothing)", () => {
    const items = getFeedItems("all", true);
    items.forEach((item) => {
      for (const { url } of elementUrls(item.content)) {
        if (url === "" || url.startsWith("#")) continue;
        expect(url).toMatch(/^[a-z][a-z0-9+.-]*:|^\/\//i);
      }
    });
  });

  test("co-located images resolve to the asset base, not the series page URL", () => {
    // The post renders at /nextjs-deep-dive/02-routing-mastery/ (autoPaths)
    // but its assets are copied to /posts/02-routing-mastery/.
    const post = getAllPosts().find((p) => p.slug === "02-routing-mastery");
    expect(post).toBeDefined();
    const url = withTrailingSlash(siteConfig.baseUrl.replace(/\/+$/, "") + getPostUrl(post!));
    const item = getFeedItems("posts", true).find((i) => i.url === url);
    expect(item).toBeDefined();
    const imgs = elementUrls(item!.content).filter((u) => u.tag === "img").map((u) => u.url);
    expect(imgs).toContain(`${siteConfig.baseUrl.replace(/\/+$/, "")}/${post!.imageBaseSlug}/assets/diagram.svg`);
  });

  test("text inside code samples is never rewritten", () => {
    const post = getAllPosts().find((p) => p.slug === "multimedia-showcase");
    expect(post).toBeDefined();
    const url = withTrailingSlash(siteConfig.baseUrl.replace(/\/+$/, "") + getPostUrl(post!));
    const item = getFeedItems("all", true).find((i) => i.url === url);
    // The post may fall outside maxItems; render through the same seam then.
    const html = item?.content ?? markdownToHtml(post!.content, {
      absoluteUrls: { pageUrl: url, siteUrl: "https://site.test", imageBaseSlug: post!.imageBaseSlug },
    });
    expect(html).toContain('src="audio.ogg"');
  });

  // renderedHtml exists only when the Python docutils renderer ran; the JS
  // fallback leaves it unset (same environment gate as the rst-parity tests).
  const rstPostWithHtml = getAllPosts().find((p) => p.sourceFormat === "rst" && p.renderedHtml);
  const rstFeedTest = rstPostWithHtml ? test : test.skip;

  rstFeedTest("rST posts use their rendered HTML in full-content feeds", () => {
    // Running rST source through the Markdown pipeline mangles directives
    // into literal text; renderedHtml is the real document.
    const url = withTrailingSlash(siteConfig.baseUrl.replace(/\/+$/, "") + getPostUrl(rstPostWithHtml!));
    const item = getFeedItems("posts", true).find((i) => i.url === url);
    expect(item).toBeDefined();
    expect(item!.content).not.toContain(".. code-block::");
    expect(item!.content).not.toMatch(/^\.\. /m);
  });

  rstFeedTest("rST feed HTML is sanitized with the RstRenderer allowlist", () => {
    const url = withTrailingSlash(siteConfig.baseUrl.replace(/\/+$/, "") + getPostUrl(rstPostWithHtml!));
    const item = getFeedItems("posts", true).find((i) => i.url === url);
    expect(item).toBeDefined();
    // The docutils pass emits <pre data-amytis-code> markers; the shared
    // sanitizer strips that attribute (it is not on the pre allowlist), so
    // its absence is direct evidence the sanitizer ran on the feed path.
    expect(item!.content).not.toContain("data-amytis-code");
    expect(item!.content).not.toContain("<script");
  });

  // Inverse environment gate of the tests above: only runs where the Python
  // docutils renderer did NOT produce renderedHtml (e.g. no python on PATH).
  const rstPostWithoutHtml = getAllPosts().find((p) => p.sourceFormat === "rst" && !p.renderedHtml);
  const rstFallbackTest = rstPostWithoutHtml ? test : test.skip;

  rstFallbackTest("rST posts without rendered HTML fall back to the excerpt", () => {
    const originalMaxItems = siteConfig.feed.maxItems;
    siteConfig.feed.maxItems = 0; // the old rST fixture would fall out of a truncated window
    const url = withTrailingSlash(siteConfig.baseUrl.replace(/\/+$/, "") + getPostUrl(rstPostWithoutHtml!));
    const item = getFeedItems("posts", true).find((i) => i.url === url);
    siteConfig.feed.maxItems = originalMaxItems;
    expect(item).toBeDefined();
    // Never the mis-parsed rST source: directive lines and literal-block
    // introducers. (Not a bare "::" check — prose like std::vector is legal.)
    expect(item!.content).not.toMatch(/^\.\. /m);
    expect(item!.content).not.toMatch(/::\s*$/m);
    // …just the plain-text excerpt as a paragraph.
    expect(item!.content).toContain("<p>");
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
      const allPosts = feedPostsUnion();
      const baseUrl = siteConfig.baseUrl.replace(/\/+$/, "");
      expect(items.length).toBe(allPosts.length);
      expect(items.map((item) => item.url).sort()).toEqual(
        allPosts.map((post) => withTrailingSlash(`${baseUrl}${getPostUrl(post)}`)).sort()
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
        allFlows.map((flow) => withTrailingSlash(`${baseUrl}${getFlowUrl(flow.slug)}`)).sort()
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
      const allPosts = feedPostsUnion();
      const allFlows = getAllFlows();
      const baseUrl = siteConfig.baseUrl.replace(/\/+$/, "");
      expect(items.map((item) => item.url).sort()).toEqual(
        [
          ...allPosts.map((post) => withTrailingSlash(`${baseUrl}${getPostUrl(post)}`)),
          ...allFlows.map((flow) => withTrailingSlash(`${baseUrl}${getFlowUrl(flow.slug)}`)),
        ].sort()
      );
    } finally {
      siteConfig.feed.maxItems = originalMaxItems;
    }
  });
});
