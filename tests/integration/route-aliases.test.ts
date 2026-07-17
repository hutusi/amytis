import { describe, expect, test } from 'bun:test';
import {
  topLevelSlugParams,
  prefixedPostParams,
  prefixedPageParams,
  seriesSlugParams,
  seriesPageParams,
  resolveTopLevelSlug,
  resolvePrefixedPost,
  resolveSeriesParam,
  resolveSeriesListingPrefix,
  findSeriesByRedirectFrom,
  collectSingleSegmentAliases,
  collectSeriesPageAliases,
} from '../../src/lib/route-aliases';
import { getAllPages } from '../../src/lib/content/posts';
import { getAllSeries } from '../../src/lib/content/series';

// Real-content fixtures this suite relies on (see content/):
// - post "the-art-of-algorithms" with redirectFrom
//   "/this-is-a-test-redirect-for-the-art-of-algorithms" (1-segment) and
//   "/this/is-a-test-redirect-for-the-art-of-algorithms" (2-segment)
// - series "markdown-showcase" with redirectFrom "/series/markdown-showcase-old"
// - Unicode post "中文测试文章" in markdown-showcase
//   (redirectFrom "/posts/中文测试文章", skipped because basePath is "posts")
//
// Unicode SERIES assertions derive the slug from whatever non-ASCII series
// exists in the content tree — local working trees may carry untracked
// (gitignored) series that CI doesn't have, so a hardcoded literal would
// pass locally and fail in CI.
const unicodeSeriesSlug = Object.keys(getAllSeries()).find(s => /[^\x00-\x7F]/.test(s));

describe('Integration: route aliases', () => {
  describe('generateStaticParams providers', () => {
    test('topLevelSlugParams covers static pages, auto-path series, and 1-segment aliases', () => {
      const slugs = topLevelSlugParams().map(p => p.slug);

      for (const page of getAllPages()) {
        expect(slugs).toContain(page.slug);
      }
      // autoPaths is enabled in site.config — every series gets a listing
      for (const seriesSlug of Object.keys(getAllSeries())) {
        expect(slugs).toContain(seriesSlug);
      }
      expect(slugs).toContain('this-is-a-test-redirect-for-the-art-of-algorithms');
    });

    test('prefixedPostParams emits auto-path post params, 2-segment aliases, and skips /posts/* aliases', () => {
      const params = prefixedPostParams();
      const keys = new Set(params.map(p => `${p.slug}/${p.postSlug}`));

      // Auto-path series post
      expect(keys.has('markdown-showcase/syntax-highlighting')).toBe(true);
      // 2-segment redirectFrom
      expect(keys.has('this/is-a-test-redirect-for-the-art-of-algorithms')).toBe(true);
      // /posts/中文测试文章 is a /posts alias with basePath 'posts' → handled by
      // posts/[slug], must NOT appear here
      expect(keys.has('posts/中文测试文章')).toBe(false);
      // Unicode series post present in raw form
      expect(keys.has('markdown-showcase/中文测试文章')).toBe(true);
    });

    test('prefixedPostParams adds encoded variants outside production only', () => {
      const keys = new Set(prefixedPostParams().map(p => `${p.slug}/${p.postSlug}`));
      // NODE_ENV is 'test' here → dev-encoding variants are present
      expect(keys.has(`markdown-showcase/${encodeURIComponent('中文测试文章')}`)).toBe(true);
    });

    test('seriesSlugParams includes canonical slugs, aliases, and encoded Unicode variants', () => {
      const slugs = new Set(seriesSlugParams().map(p => p.slug));
      expect(slugs.has('markdown-showcase')).toBe(true);
      expect(slugs.has('markdown-showcase-old')).toBe(true);
      if (unicodeSeriesSlug) {
        expect(slugs.has(unicodeSeriesSlug)).toBe(true);
        expect(slugs.has(encodeURIComponent(unicodeSeriesSlug))).toBe(true);
      }
    });

    test('pagination providers return the placeholder sentinel or real params, never []', () => {
      expect(prefixedPageParams().length).toBeGreaterThan(0);
      expect(seriesPageParams().length).toBeGreaterThan(0);
    });
  });

  describe('collision throws (strict build)', () => {
    test('a 1-segment alias colliding with a reserved slug throws', () => {
      const posts = [{ slug: 'p1', redirectFrom: ['/about'] }];
      expect(() => collectSingleSegmentAliases(posts, new Set(['about']))).toThrow(
        /redirectFrom "\/about" in post "p1" conflicts/
      );
    });

    test('the same alias claimed by two posts throws', () => {
      const posts = [
        { slug: 'p1', redirectFrom: ['/old-name'] },
        { slug: 'p2', redirectFrom: ['/old-name'] },
      ];
      expect(() => collectSingleSegmentAliases(posts, new Set())).toThrow(
        /redirectFrom "\/old-name" in post "p2" conflicts/
      );
    });

    test('an alias equal to the post canonical path is skipped, not registered', () => {
      const posts = [{ slug: 'p1', redirectFrom: ['/posts/p1'] }];
      expect(collectSingleSegmentAliases(posts, new Set())).toEqual([]);
    });

    test('a series page alias claimed by two series throws', () => {
      const series = [
        { slug: 's1', totalPages: 3, redirectFrom: ['/series/old'] },
        { slug: 's2', totalPages: 2, redirectFrom: ['/series/old'] },
      ];
      expect(() => collectSeriesPageAliases(series)).toThrow(/claimed by both "s1" and "s2"/);
    });

    test('a series page alias shadowing an existing series slug throws', () => {
      const series = [
        { slug: 's1', totalPages: 3, redirectFrom: ['/series/s2'] },
        { slug: 's2', totalPages: 1, redirectFrom: [] },
      ];
      expect(() => collectSeriesPageAliases(series)).toThrow(/conflicts with an existing series slug/);
    });

    test('aliases of single-page series are not emitted', () => {
      const series = [{ slug: 's1', totalPages: 1, redirectFrom: ['/series/old'] }];
      expect(collectSeriesPageAliases(series).size).toBe(0);
    });
  });

  describe('resolveTopLevelSlug', () => {
    test('static pages resolve as pages and beat aliases', () => {
      const resolution = resolveTopLevelSlug('about');
      expect(resolution?.kind).toBe('page');
    });

    test('auto-path series slugs resolve as series listings (ASCII and Unicode)', () => {
      expect(resolveTopLevelSlug('markdown-showcase')).toMatchObject({
        kind: 'seriesListing',
        seriesSlug: 'markdown-showcase',
        prefix: 'markdown-showcase',
      });
      if (unicodeSeriesSlug) {
        expect(resolveTopLevelSlug(unicodeSeriesSlug)).toMatchObject({
          kind: 'seriesListing',
          seriesSlug: unicodeSeriesSlug,
        });
        // Percent-encoded form decodes to the same listing
        expect(resolveTopLevelSlug(encodeURIComponent(unicodeSeriesSlug))).toMatchObject({
          kind: 'seriesListing',
          seriesSlug: unicodeSeriesSlug,
        });
      }
    });

    test('1-segment redirectFrom resolves as a redirect to the canonical post URL', () => {
      const resolution = resolveTopLevelSlug('this-is-a-test-redirect-for-the-art-of-algorithms');
      expect(resolution).toMatchObject({ kind: 'redirect' });
      if (resolution?.kind === 'redirect') {
        expect(resolution.to).toBe('/posts/the-art-of-algorithms');
      }
    });

    test('unknown slugs resolve to null', () => {
      expect(resolveTopLevelSlug('definitely-not-a-real-top-level-slug')).toBeNull();
    });

    test('malformed percent-encoding does not throw', () => {
      expect(() => resolveTopLevelSlug('%E0%A4%A')).not.toThrow();
    });
  });

  describe('resolvePrefixedPost', () => {
    test('canonical series post resolves as canonical (ASCII and Unicode)', () => {
      expect(resolvePrefixedPost('markdown-showcase', 'syntax-highlighting')).toMatchObject({
        kind: 'canonical',
        post: { slug: 'syntax-highlighting' },
      });
      expect(resolvePrefixedPost('markdown-showcase', '中文测试文章')).toMatchObject({
        kind: 'canonical',
      });
      // Encoded postSlug (what the dev server delivers for Unicode URLs)
      expect(resolvePrefixedPost('markdown-showcase', encodeURIComponent('中文测试文章'))).toMatchObject({
        kind: 'canonical',
      });
    });

    test('2-segment legacy alias resolves as redirect to the canonical URL', () => {
      const resolution = resolvePrefixedPost('this', 'is-a-test-redirect-for-the-art-of-algorithms');
      expect(resolution).toMatchObject({ kind: 'redirect' });
      if (resolution?.kind === 'redirect') {
        expect(resolution.to).toBe('/posts/the-art-of-algorithms');
      }
    });

    test('a known post under an unknown prefix resolves to null (404)', () => {
      expect(resolvePrefixedPost('not-a-prefix', 'syntax-highlighting')).toBeNull();
    });

    test('an unknown post resolves to null', () => {
      expect(resolvePrefixedPost('markdown-showcase', 'no-such-post')).toBeNull();
    });

    test('duplicate slug across series resolves within the requested series', () => {
      // `first-post`/`second-post` exist in both rst-toctree and
      // rst-toctree-precedence. A global bare-slug lookup would send one
      // series' child to the other; the prefix must scope the lookup.
      for (const slug of ['first-post', 'second-post']) {
        for (const series of ['rst-toctree', 'rst-toctree-precedence']) {
          expect(resolvePrefixedPost(series, slug)).toMatchObject({
            kind: 'canonical',
            post: { slug, series },
          });
        }
      }
    });
  });

  describe('resolveSeriesParam', () => {
    test('canonical series slug resolves as canonical', () => {
      expect(resolveSeriesParam('markdown-showcase')).toEqual({
        kind: 'canonical',
        slug: 'markdown-showcase',
      });
    });

    test('redirectFrom alias resolves to the canonical series', () => {
      const resolution = resolveSeriesParam('markdown-showcase-old');
      expect(resolution.kind).toBe('alias');
      if (resolution.kind === 'alias') {
        expect(resolution.canonicalSlug).toBe('markdown-showcase');
        expect(resolution.data.title.length).toBeGreaterThan(0);
      }
    });

    test('encoded Unicode params decode before resolution', () => {
      // Use the tracked Unicode POST slug — decoding behavior is what's under
      // test, so any non-ASCII param works and this one exists in CI.
      expect(resolveSeriesParam(encodeURIComponent('中文测试文章'))).toEqual({
        kind: 'canonical',
        slug: '中文测试文章',
      });
      if (unicodeSeriesSlug) {
        expect(resolveSeriesParam(encodeURIComponent(unicodeSeriesSlug))).toEqual({
          kind: 'canonical',
          slug: unicodeSeriesSlug,
        });
      }
    });
  });

  describe('shared lookups', () => {
    test('resolveSeriesListingPrefix maps auto-path prefixes and rejects unknowns', () => {
      expect(resolveSeriesListingPrefix('markdown-showcase')).toBe('markdown-showcase');
      expect(resolveSeriesListingPrefix('not-a-series')).toBeUndefined();
    });

    test('findSeriesByRedirectFrom normalizes and matches declared aliases', () => {
      expect(findSeriesByRedirectFrom('/series/markdown-showcase-old')?.slug).toBe('markdown-showcase');
      expect(findSeriesByRedirectFrom('series/markdown-showcase-old')?.slug).toBe('markdown-showcase');
      expect(findSeriesByRedirectFrom('/series/never-existed')).toBeNull();
      expect(findSeriesByRedirectFrom('')).toBeNull();
    });
  });
});
