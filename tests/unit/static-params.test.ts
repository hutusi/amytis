/**
 * Unit tests for generateStaticParams — verifies that every dynamic route with
 * `dynamicParams = false` returns a non-empty placeholder array when content
 * directories are empty, rather than returning [] which would cause Next.js
 * static export (`output: export`) to fail at build time.
 *
 * Strategy: mock.module() replaces @/lib/markdown with empty-collection stubs,
 * then each test uses await import() to load the page module *after* mocks are
 * in place (bun:test does not auto-hoist mock.module, so dynamic imports are
 * required).
 */
import { describe, test, expect, mock } from 'bun:test';

// ─── Next.js runtime stubs ───────────────────────────────────────────────────
// notFound / redirect are only valid inside the Next.js runtime; stub them so
// page files can be imported without errors in the test environment.
mock.module('next/navigation', () => ({
  notFound: () => { throw new Error('NOT_FOUND'); },
  redirect: () => { throw new Error('REDIRECT'); },
  usePathname: () => '/',
  useRouter: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

mock.module('next/link', () => ({ default: 'a' }));
mock.module('next/image', () => ({ default: 'img' }));

// ─── i18n stubs ──────────────────────────────────────────────────────────────
mock.module('@/lib/i18n', () => ({
  t: (k: string) => k,
  tWith: (k: string) => k,
  resolveLocale: (v: unknown) =>
    typeof v === 'string' ? v : ((v as Record<string, string>)?.en ?? ''),
  useLanguage: () => ({ locale: 'en', setLocale: () => {} }),
}));

// ─── Component / layout stubs ────────────────────────────────────────────────
// Replaced wholesale so transitive imports inside each component are never
// evaluated. Only the generateStaticParams export from each page is exercised.
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

// ─── Data layer stub: empty content ──────────────────────────────────────────
// Simulates a fresh install where all content directories exist but contain no
// files. Every function that iterates content returns an empty collection.
mock.module('@/lib/markdown', () => ({
  getAllFlows: () => [],
  getAllNotes: () => [],
  getAllPosts: () => [],
  getAllBooks: () => [],
  getAllSeries: () => ({}),
  getAllTags: () => ({}),
  getAllAuthors: () => ({}),

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
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  resolveAuthorParam: () => null,

  getAdjacentFlows: () => ({ prev: null, next: null }),
  buildSlugRegistry: () => new Map(),
  getBacklinks: () => [],
}));

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

});
