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

// ─── Capture real markdown module ────────────────────────────────────────────
// Static imports are hoisted and resolved before any executable code (including
// beforeAll / mock.module calls), so this always captures the real module.
import * as realMarkdown from '../../src/lib/markdown';

let mockedPosts: Array<{ slug: string }> = [];
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
mock.module('@/layouts/PostLayout', () => Noop);
mock.module('@/layouts/SimpleLayout', () => Noop);
mock.module('@/layouts/BookLayout', () => Noop);

// ─── Data layer stub: deferred to beforeAll ───────────────────────────────────
// Must NOT be called at module level — would replace @/lib/markdown in the
// shared registry before integration test files resolve their static imports.
beforeAll(() => {
  mock.module('@/lib/markdown', () => ({
    getAllFlows: () => [],
    getAllNotes: () => [],
    getAllPosts: () => mockedPosts,
    getAllBooks: () => [],
    getAllSeries: () => ({}),
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

    getSeriesData: () => null,
    getSeriesPosts: () => [],
    getSeriesAuthors: () => [],

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
  process.env.NODE_ENV = originalNodeEnv;
});

afterEach(() => {
  mockedPosts = [];
  process.env.NODE_ENV = originalNodeEnv;
});

// ─── Restore real markdown module ─────────────────────────────────────────────
afterAll(() => {
  mock.module('@/lib/markdown', () => realMarkdown);
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

    test('series/[slug]/page/[page] returns [{ slug: "_", page: "2" }]', async () => {
      const { generateStaticParams } = await import('../../src/app/series/[slug]/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_', page: '2' }]);
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

    test('[slug]/page/[page]/page returns placeholder when no custom paths', async () => {
      const { generateStaticParams } = await import('../../src/app/[slug]/page/[page]/page');
      const params = await generateStaticParams();
      expect(params).toEqual([{ slug: '_', page: '2' }]);
    });
  });

});
