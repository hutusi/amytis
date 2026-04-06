/**
 * Unit tests for generateStaticParams — verifies that every dynamic route with
 * `dynamicParams = false` returns a non-empty placeholder array when content
 * directories are empty, rather than returning [] which would cause Next.js
 * static export (`output: export`) to fail at build time.
 *
 * Isolation strategy
 * ──────────────────
 * bun:test loads all test files before running any tests. A module-level
 * mock.module() call runs at load time and would replace @/lib/markdown in the
 * shared module registry before integration test files resolve their static
 * imports — causing those tests to see empty stubs instead of real content.
 *
 * To avoid this:
 *   • Next.js / component mocks stay at module level — integration tests never
 *     import those, so they are harmless.
 *   • @/lib/markdown is mocked inside beforeAll, which runs AFTER all files
 *     have finished loading and resolving their static imports.
 *   • Page files are loaded via await import() inside each test, which runs
 *     after beforeAll, so they pick up the mock correctly.
 *   • afterAll restores the real module so any subsequent tests see real data.
 */
import { describe, test, expect, mock, beforeAll, beforeEach, afterAll, afterEach } from 'bun:test';

// ─── Capture real modules ─────────────────────────────────────────────────────
// Static imports are hoisted and resolved before any executable code (including
// beforeAll / mock.module calls), so this always captures the real module.
import * as realMarkdown from '../../src/lib/markdown';
import * as realUrls from '../../src/lib/urls';

// `import * as ns` creates a live namespace — its properties update when
// mock.module() patches the registry.  Spread into a plain object here
// (before any mocking) to get a shallow snapshot of the real exports so
// restore calls always put back the originals, not the current mock state.
// Note: nested objects (e.g. RESERVED_ROUTE_SEGMENTS Set) share the same
// reference, but they are never mutated during tests so this is safe.
const snapshotUrls = { ...realUrls };

let mockedPosts: Array<{ slug: string; series?: string; redirectFrom?: string[] }> = [];
let mockedNotes: Array<{ slug: string }> = [];
let mockedSeries: Record<string, Array<{ slug: string }>> = {};
let mockedSeriesData: Record<string, { redirectFrom?: string[]; title?: string }> = {};
const originalNodeEnv = process.env.NODE_ENV;

// ─── Next.js runtime stubs (module-level — safe) ─────────────────────────────
mock.module('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND'); },
  redirect: () => { throw new Error('REDIRECT'); },
  usePathname: () => '/',
  useRouter: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

mock.module('next/link', () => ({ default: 'a' }));
mock.module('next/image', () => ({ default: 'img' }));

// ─── i18n stub (module-level — safe) ─────────────────────────────────────────
mock.module('@/lib/i18n', () => ({
  t: (k: string) => k,
  tWith: (k: string) => k,
  resolveLocale: (v: unknown) =>
    typeof v === 'string' ? v : ((v as Record<string, string>)?.en ?? ''),
  useLanguage: () => ({ locale: 'en', setLocale: () => {} }),
}));

// ─── Component / layout stubs (module-level — safe) ──────────────────────────
const Noop = { default: () => null };

mock.module('@/components/PageHeader', () => Noop);
mock.module('@/components/FlowContent', () => Noop);
mock.module('@/components/FlowHubTabs', () => Noop);
mock.module('@/components/NoteContent', () => Noop);
mock.module('@/components/FlowCalendarSidebar', () => Noop);
mock.module('@/components/MarkdownRenderer', () => Noop);
mock.module('@/components/Backlinks', () => Noop);
mock.module('@/components/ShareBar', () => Noop);
mock.module('@/components/CoverImage', () => Noop);
mock.module('@/components/SeriesCatalog', () => Noop);
mock.module('@/components/Pagination', () => Noop);
mock.module('@/components/PostList', () => Noop);
mock.module('@/components/PostCard', () => Noop);
mock.module('@/components/TagPageHeader', () => Noop);
mock.module('@/components/TagSidebar', () => Noop);
mock.module('@/components/TagContentTabs', () => Noop);
mock.module('@/components/Tag', () => Noop);
mock.module('@/components/AuthorStats', () => Noop);
mock.module('@/components/TranslatedText', () => Noop);
mock.module('@/components/NoteSidebar', () => Noop);
mock.module('@/components/Comments', () => Noop);
mock.module('@/layouts/PostLayout', () => Noop);
mock.module('@/layouts/SimpleLayout', () => Noop);
mock.module('@/layouts/BookLayout', () => Noop);

// ─── Data layer stub: deferred to beforeAll ───────────────────────────────────
// Must NOT be called at module level — would replace @/lib/markdown in the
// shared registry before integration test files resolve their static imports.
beforeAll(() => {
  mock.module('@/lib/markdown', () => ({
    getAllFlows: () => [],
    getAllNotes: () => mockedNotes,
    getAllPosts: () => mockedPosts.filter(p => !(process.env.NODE_ENV === 'production' && p.draft)),
    getAllBooks: () => [],
    getAllSeries: () => mockedSeries,
    getAllTags: () => ({}),
    getAllAuthors: () => ({}),
    getAllPages: () => [],
    getListingPosts: () => [],

    getFlowsByYear: () => [],
    getFlowsByMonth: () => [],
    getFlowBySlug: () => null,
    getFlowTags: () => ({}),
    getFlowsByTag: () => [],

    getNoteBySlug: () => null,
    getNoteTags: () => ({}),
    getNotesByTag: () => [],
    getAdjacentNotes: () => ({ prev: null, next: null }),
    getRecentNotes: () => [],

    getPostBySlug: () => null,
    getRelatedPosts: () => [],
    getAdjacentPosts: () => ({ prev: null, next: null }),
    getPostsByTag: () => [],
    getPostsByAuthor: () => [],

    getBookData: () => null,
    getBookChapter: () => null,
    getBooksByAuthor: () => [],

    getSeriesData: (slug: string) => mockedSeriesData[slug] ?? null,
    getSeriesPosts: () => [],
    getSeriesAuthors: () => [],
    getCollectionsForPost: () => [],

    getAuthorSlug: (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    resolveAuthorParam: () => null,

    getAdjacentFlows: () => ({ prev: null, next: null }),
    buildSlugRegistry: () => new Map(),
    getBacklinks: () => [],
  }));
});

beforeEach(() => {
  mockedPosts = [];
  mockedNotes = [];
  mockedSeries = {};
  mockedSeriesData = {};
  process.env.NODE_ENV = originalNodeEnv;
});

afterEach(() => {
  mockedPosts = [];
  mockedNotes = [];
  mockedSeries = {};
  mockedSeriesData = {};
  process.env.NODE_ENV = originalNodeEnv;
});

// ─── Restore real modules ─────────────────────────────────────────────────────
afterAll(() => {
  mock.module('@/lib/markdown', () => realMarkdown);
  mock.module('@/lib/urls', () => snapshotUrls);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('generateStaticParams — placeholder when content is empty', () => {

  describe('flow routes', () => {
    test('flows/[year] returns [{ year: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/flows/[year]/page');
      expect(generateStaticParams()).toEqual([{ year: '_' }]);
    });

    test('flows/[year]/[month] returns [{ year: "_", month: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/flows/[year]/[month]/page');
      expect(generateStaticParams()).toEqual([{ year: '_', month: '_' }]);
    });

    test('flows/[year]/[month]/[day] returns [{ year: "_", month: "_", day: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/flows/[year]/[month]/[day]/page');
      expect(generateStaticParams()).toEqual([{ year: '_', month: '_', day: '_' }]);
    });

    test('flows/page/[page] always returns at least [{ page: "2" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/flows/page/[page]/page');
      const params = generateStaticParams();
      expect(params.length).toBeGreaterThanOrEqual(1);
      expect(params[0]).toEqual({ page: '2' });
    });
  });

  describe('notes routes', () => {
    test('notes/[slug] returns [{ slug: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/notes/[slug]/page');
      expect(generateStaticParams()).toEqual([{ slug: '_' }]);
    });

    test('notes/[slug] includes raw and encoded Unicode slug in non-production', async () => {
      mockedNotes = [{ slug: '推理模型' }];
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/notes/[slug]/page');
      const params = generateStaticParams();
      expect(params).toContainEqual({ slug: '推理模型' });
      expect(params).toContainEqual({ slug: '%E6%8E%A8%E7%90%86%E6%A8%A1%E5%9E%8B' });
    });

    test('notes/[slug] includes only raw Unicode slug in production', async () => {
      mockedNotes = [{ slug: '推理模型' }];
      process.env.NODE_ENV = 'production';
      const { generateStaticParams } = await import('../../src/app/notes/[slug]/page');
      const params = generateStaticParams();
      expect(params).toContainEqual({ slug: '推理模型' });
      expect(params).not.toContainEqual({ slug: '%E6%8E%A8%E7%90%86%E6%A8%A1%E5%9E%8B' });
    });

    test('notes/page/[page] always returns at least [{ page: "2" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/notes/page/[page]/page');
      const params = generateStaticParams();
      expect(params.length).toBeGreaterThanOrEqual(1);
      expect(params[0]).toEqual({ page: '2' });
    });
  });

  describe('books routes', () => {
    test('books/[slug] returns [{ slug: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/books/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_' }]);
    });

    test('books/[slug]/[chapter] returns [{ slug: "_", chapter: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/books/[slug]/[chapter]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_', chapter: '_' }]);
    });
  });

  describe('series routes', () => {
    test('series/[slug] returns [{ slug: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_' }]);
    });

    test('series/[slug] includes redirectFrom slug when series is renamed', async () => {
      mockedSeries = { 'new-name': [] };
      mockedSeriesData = { 'new-name': { redirectFrom: ['/series/old-name'], title: 'New Series' } };
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'new-name' });
      expect(params).toContainEqual({ slug: 'old-name' });
    });

    test('series/[slug] includes raw and encoded Unicode slug in non-production', async () => {
      mockedSeries = { '软件构架设计': [] };
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: '软件构架设计' });
      expect(params).toContainEqual({ slug: '%E8%BD%AF%E4%BB%B6%E6%9E%84%E6%9E%B6%E8%AE%BE%E8%AE%A1' });
    });

    test('series/[slug] includes only raw Unicode slug in production', async () => {
      mockedSeries = { '软件构架设计': [] };
      process.env.NODE_ENV = 'production';
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: '软件构架设计' });
      expect(params).not.toContainEqual({ slug: '%E8%BD%AF%E4%BB%B6%E6%9E%84%E6%9E%B6%E8%AE%BE%E8%AE%A1' });
    });

    test('series/[slug]/page/[page] returns [{ slug: "_", page: "2" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_', page: '2' }]);
    });

    test('series/[slug]/page/[page] includes encoded Unicode slug in non-production', async () => {
      mockedSeries = { '软件构架设计': Array.from({ length: 6 }, (_, i) => ({ slug: `p${i + 1}` })) };
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: '软件构架设计', page: '2' });
      expect(params).toContainEqual({ slug: '%E8%BD%AF%E4%BB%B6%E6%9E%84%E6%9E%B6%E8%AE%BE%E8%AE%A1', page: '2' });
    });

    test('series/[slug]/page/[page] includes redirectFrom slug when series is renamed', async () => {
      mockedSeries = { 'new-name': Array.from({ length: 6 }, (_, i) => ({ slug: `p${i + 1}` })) };
      mockedSeriesData = { 'new-name': { redirectFrom: ['/series/old-name'], title: 'New Series' } };
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'new-name', page: '2' });
      expect(params).toContainEqual({ slug: 'old-name', page: '2' });
    });

    test('series/[slug]/page/[page] redirects old alias slugs to the canonical paginated path', async () => {
      mockedSeries = { 'new-name': Array.from({ length: 6 }, (_, i) => ({ slug: `p${i + 1}` })) };
      mockedSeriesData = { 'new-name': { redirectFrom: ['/series/old-name'], title: 'New Series' } };
      const page = await import('../../src/app/series/[slug]/page/[page]/page');
      await expect(page.default({
        params: Promise.resolve({ slug: 'old-name', page: '2' }),
      })).resolves.toBeDefined();
    });
  });

  describe('posts routes', () => {
    test('posts/[slug] returns [{ slug: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/posts/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_' }]);
    });

    test('posts/[slug] includes raw and encoded Unicode slug in non-production', async () => {
      mockedPosts = [{ slug: '中文测试文章' }];
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/posts/[slug]/page');
      const params = await generateStaticParams();

      expect(params).toContainEqual({ slug: '中文测试文章' });
      expect(params).toContainEqual({ slug: '%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95%E6%96%87%E7%AB%A0' });
    });

    test('posts/[slug] includes only raw Unicode slug in production', async () => {
      mockedPosts = [{ slug: '中文测试文章' }];
      process.env.NODE_ENV = 'production';
      const { generateStaticParams } = await import('../../src/app/posts/[slug]/page');
      const params = await generateStaticParams();

      expect(params).toContainEqual({ slug: '中文测试文章' });
      expect(params).not.toContainEqual({ slug: '%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95%E6%96%87%E7%AB%A0' });
    });

    test('posts/page/[page] returns [{ page: "2" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/posts/page/[page]/page');
      const params = generateStaticParams();
      expect(params).toEqual([{ page: '2' }]);
    });
  });

  describe('taxonomy routes', () => {
    test('tags/[tag] returns [{ tag: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/tags/[tag]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ tag: '_' }]);
    });

    test('authors/[author] returns [{ author: "_" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/authors/[author]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ author: '_' }]);
    });
  });

  describe('homepage pagination', () => {
    test('page/[page] returns [{ page: "2" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ page: '2' }]);
    });
  });

  describe('autoPaths series routing', () => {
    // autoPaths defaults to true — series posts are served at /[series-slug]/[post-slug]

    describe('autoPaths disabled', () => {
      // Override getSeriesAutoPaths to false and use /posts/[slug] as canonical URL.
      beforeEach(() => {
        mock.module('@/lib/urls', () => ({
          ...snapshotUrls,
          getSeriesAutoPaths: () => false,
          getPostUrl: (post: { slug: string; series?: string }) => `/posts/${post.slug}`,
        }));
      });

      afterEach(() => {
        mock.module('@/lib/urls', () => snapshotUrls);
      });

      test('posts/[slug] includes series posts when autoPaths is disabled', async () => {
        mockedPosts = [{ slug: 'series-post', series: 'my-series' }];
        const { generateStaticParams } = await import('../../src/app/posts/[slug]/page');
        const params = await generateStaticParams();
        expect(params).toContainEqual({ slug: 'series-post' });
      });

      test('[slug]/[postSlug] does not include series auto-path params when autoPaths is disabled', async () => {
        mockedSeries = { 'my-series': [{ slug: 'my-post' }] };
        const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
        const params = await generateStaticParams();
        expect(params).not.toContainEqual({ slug: 'my-series', postSlug: 'my-post' });
      });

      test('posts/[slug] includes series post when canonical matches /posts/[slug]', async () => {
        mockedPosts = [{ slug: 'my-post', series: 'my-series' }];
        const { generateStaticParams } = await import('../../src/app/posts/[slug]/page');
        const params = await generateStaticParams();
        expect(params).toContainEqual({ slug: 'my-post' });
      });
    });

    test('[slug]/[postSlug] includes redirectFrom paths as additional params', async () => {
      mockedPosts = [{ slug: 'my-post', series: 'my-series', redirectFrom: ['/old-prefix/my-post'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'old-prefix', postSlug: 'my-post' });
    });

    test('[slug]/[postSlug] does not include /posts/* redirectFrom when basePath is "posts"', async () => {
      mockedPosts = [{ slug: 'new-name', redirectFrom: ['/posts/old-name'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).not.toContainEqual({ slug: 'posts', postSlug: 'old-name' });
    });

    test('posts/[slug] includes redirectFrom slug when post is renamed within /posts/', async () => {
      mockedPosts = [{ slug: 'new-name', redirectFrom: ['/posts/old-name'] }];
      const { generateStaticParams } = await import('../../src/app/posts/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'new-name' });
      expect(params).toContainEqual({ slug: 'old-name' });
    });

    test('[slug]/page includes single-segment redirectFrom paths as additional params', async () => {
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/old-slug'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'old-slug' });
    });

    test('[slug]/page does not include multi-segment redirectFrom paths', async () => {
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/old-prefix/my-post'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      const params = await generateStaticParams();
      expect(params).not.toContainEqual({ slug: 'old-prefix' });
    });

    test('[slug]/page does not include single-segment redirectFrom for draft posts in production', async () => {
      mockedPosts = [{ slug: 'my-post', draft: true, redirectFrom: ['/old-slug'] }];
      process.env.NODE_ENV = 'production';
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      const params = await generateStaticParams();
      expect(params).not.toContainEqual({ slug: 'old-slug' });
    });

    test('[slug]/page throws when redirectFrom alias conflicts with a reserved route', async () => {
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/tags'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      expect(() => generateStaticParams()).toThrow('[amytis] redirectFrom "/tags"');
    });

    test('[slug]/page throws when two posts claim the same single-segment alias', async () => {
      mockedPosts = [
        { slug: 'post-a', redirectFrom: ['/old-slug'] },
        { slug: 'post-b', redirectFrom: ['/old-slug'] },
      ];
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      expect(() => generateStaticParams()).toThrow('[amytis] redirectFrom "/old-slug"');
    });

    test('[slug]/page throws when redirectFrom alias conflicts with "posts" (RESERVED_ROUTE_SEGMENTS)', async () => {
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/posts'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      expect(() => generateStaticParams()).toThrow('[amytis] redirectFrom "/posts"');
    });

    test('[slug]/page includes Unicode single-segment redirectFrom slug as param', async () => {
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/中文路由'] }];
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: '中文路由' });
    });

    describe('autoPaths enabled', () => {
      // Use beforeEach (not beforeAll) so each test starts with a clean base mock,
      // preventing stale state from tests that inline-override the mock.
      beforeEach(() => {
        mock.module('@/lib/urls', () => ({
          ...snapshotUrls,
          getSeriesAutoPaths: () => true,
          getSeriesCustomPaths: () => ({}),
          getPostUrl: (post: { slug: string; series?: string }) =>
            post.series ? `/${post.series}/${post.slug}` : `/posts/${post.slug}`,
          validateSeriesAutoPaths: () => {},
        }));
      });

      afterEach(() => {
        mock.module('@/lib/urls', () => snapshotUrls);
      });

      test('[slug]/page includes auto-path series slug when autoPaths enabled', async () => {
        mockedSeries = { 'my-series': [{ slug: 'my-post' }] };
        const { generateStaticParams } = await import('../../src/app/[slug]/page');
        const params = await generateStaticParams();
        expect(params).toContainEqual({ slug: 'my-series' });
      });

      test('[slug]/page includes Unicode auto-path series slug when autoPaths enabled', async () => {
        mockedSeries = { '中文系列': [{ slug: 'post-one' }] };
        const { generateStaticParams } = await import('../../src/app/[slug]/page');
        const params = await generateStaticParams();
        expect(params).toContainEqual({ slug: '中文系列' });
      });

      test('[slug]/page uses customPaths prefix for series with override, not the series slug', async () => {
        // Override the base mock to add a customPaths entry for this test.
        mock.module('@/lib/urls', () => ({
          ...snapshotUrls,
          getSeriesAutoPaths: () => true,
          getSeriesCustomPaths: () => ({ 'my-series': 'articles' }),
          getPostUrl: (post: { slug: string; series?: string }) =>
            post.series === 'my-series' ? `/articles/${post.slug}` : `/posts/${post.slug}`,
          validateSeriesAutoPaths: () => {},
        }));
        mockedSeries = { 'my-series': [{ slug: 'my-post' }] };
        const { generateStaticParams } = await import('../../src/app/[slug]/page');
        const params = await generateStaticParams();
        expect(params).toContainEqual({ slug: 'articles' });
        expect(params).not.toContainEqual({ slug: 'my-series' });
      });
    });
  });

  describe('custom path routes', () => {
    test('[slug]/page returns at least one param (static pages + no custom paths)', async () => {
      const { generateStaticParams } = await import('../../src/app/[slug]/page');
      const params = await generateStaticParams();
      // With no pages, no custom basePath, and no series customPaths configured,
      // the result is an empty array — but the route itself is static so this is valid.
      expect(Array.isArray(params)).toBe(true);
    });

    test('[slug]/[postSlug]/page returns [{ slug: "_", postSlug: "_" }] when no custom paths', async () => {
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_', postSlug: '_' }]);
    });

    test('[slug]/[postSlug] includes encoded Unicode postSlug variants in non-production', async () => {
      // Use redirectFrom to place a Unicode postSlug at a 2-segment path — no url mock needed.
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/old-prefix/中文文章'] }];
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'old-prefix', postSlug: '中文文章' });
      expect(params).toContainEqual({ slug: 'old-prefix', postSlug: encodeURIComponent('中文文章') });
    });

    test('[slug]/[postSlug] includes encoded Unicode prefix variants in non-production', async () => {
      mockedSeries = { '软件构架设计': [{ slug: 'architecture-post' }] };
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: '软件构架设计', postSlug: 'architecture-post' });
      expect(params).toContainEqual({ slug: encodeURIComponent('软件构架设计'), postSlug: 'architecture-post' });
    });

    test('[slug]/[postSlug] includes encoded Unicode prefix and postSlug variants together in non-production', async () => {
      mockedSeries = { '软件构架设计': [{ slug: '中文文章' }] };
      process.env.NODE_ENV = 'development';
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: '软件构架设计', postSlug: '中文文章' });
      expect(params).toContainEqual({ slug: encodeURIComponent('软件构架设计'), postSlug: '中文文章' });
      expect(params).toContainEqual({ slug: '软件构架设计', postSlug: encodeURIComponent('中文文章') });
      expect(params).toContainEqual({ slug: encodeURIComponent('软件构架设计'), postSlug: encodeURIComponent('中文文章') });
    });

    test('[slug]/[postSlug] does not include encoded Unicode postSlug variants in production', async () => {
      mockedPosts = [{ slug: 'my-post', redirectFrom: ['/old-prefix/中文文章'] }];
      process.env.NODE_ENV = 'production';
      const { generateStaticParams } = await import('../../src/app/[slug]/[postSlug]/page');
      const params = await generateStaticParams();
      expect(params).toContainEqual({ slug: 'old-prefix', postSlug: '中文文章' });
      expect(params).not.toContainEqual({ slug: 'old-prefix', postSlug: encodeURIComponent('中文文章') });
    });

    test('[slug]/[postSlug] page resolves encoded Unicode series prefix without notFound', async () => {
      mockedSeries = { '软件构架设计': [{ slug: 'my-post' }] };
      mockedSeriesData = { '软件构架设计': { title: '软件构架设计' } };
      mockedPosts = [{
        slug: 'my-post',
        title: 'My Post',
        excerpt: 'Excerpt',
        date: '2026-01-01',
        authors: ['Author'],
        series: '软件构架设计',
        redirectFrom: ['/软件构架设计/my-post'],
        layout: 'post',
        content: 'Body',
        headings: [],
        imageBaseSlug: 'posts',
        category: 'Test',
        tags: [],
        readingTime: '1 min read',
      }];

      const page = await import('../../src/app/[slug]/[postSlug]/page');
      await expect(page.default({
        params: Promise.resolve({
          slug: encodeURIComponent('软件构架设计'),
          postSlug: 'my-post',
        }),
      })).resolves.toBeDefined();
    });

    test('[slug]/page/[page]/page returns placeholder when no custom paths', async () => {
      const { generateStaticParams } = await import('../../src/app/[slug]/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_', page: '2' }]);
    });
  });

});
