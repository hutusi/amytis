import { describe, expect, test } from 'bun:test';
import {
  getTwinnedPathManifest,
  hasLocaleContent,
  localeDeepParams,
  localeHomeParams,
  localeSecondLevelParams,
  resolveLocalizedPath,
} from '../../src/lib/locale-routes';

// Relies on the tracked zh fixtures (see locale-trees.test.ts): translated
// posts, series and the sample book, the zh-original post, the zh-only series,
// and the migrated zh pages. What the zh tree still lacks (notes, the
// nextjs-deep-dive series, the other books, the subscribe page) pins sparse
// generation.

describe('resolveLocalizedPath grammar', () => {
  test('locale root → localeHome', () => {
    expect(resolveLocalizedPath('zh', [])).toEqual({ kind: 'localeHome', locale: 'zh' });
  });

  test('section listings exist only for kinds the tree holds', () => {
    expect(resolveLocalizedPath('zh', ['posts'])).toMatchObject({ kind: 'postsListing', page: 1 });
    expect(resolveLocalizedPath('zh', ['series'])).toMatchObject({ kind: 'seriesIndexListing' });
    expect(resolveLocalizedPath('zh', ['books'])).toMatchObject({ kind: 'booksListing' });
    expect(resolveLocalizedPath('zh', ['notes'])).toBeNull();
    expect(resolveLocalizedPath('zh', ['flows'])).toBeNull();
  });

  test('posts resolve under the basePath even though it is "posts"', () => {
    const twin = resolveLocalizedPath('zh', ['posts', 'i18n-routing-considerations']);
    expect(twin).toMatchObject({ kind: 'post' });
    if (twin?.kind === 'post') {
      expect(twin.post.locale).toBe('zh');
      expect(twin.post.title).toBe('静态 Next.js 博客中的 i18n：客户端切换 vs 基于 URL 的路由');
    }
    expect(resolveLocalizedPath('zh', ['posts', 'zh-original-demo'])).toMatchObject({ kind: 'post' });
    expect(resolveLocalizedPath('zh', ['posts', 'no-such-post'])).toBeNull();
  });

  test('series surfaces: landing, prefix listing, and scoped child post', () => {
    expect(resolveLocalizedPath('zh', ['series', 'zh-demo-series'])).toMatchObject({
      kind: 'seriesPage', seriesSlug: 'zh-demo-series', page: 1,
    });
    expect(resolveLocalizedPath('zh', ['zh-demo-series'])).toMatchObject({
      kind: 'seriesPrefixListing', seriesSlug: 'zh-demo-series', page: 1,
    });
    expect(resolveLocalizedPath('zh', ['zh-demo-series', 'di-yi-pian'])).toMatchObject({ kind: 'post' });
    // A translated series exists in the mirror; a default-tree-only one does not.
    expect(resolveLocalizedPath('zh', ['series', 'markdown-showcase'])).toMatchObject({ kind: 'seriesPage' });
    expect(resolveLocalizedPath('zh', ['series', 'nextjs-deep-dive'])).toBeNull();
  });

  test('pages resolve from the locale tree', () => {
    const about = resolveLocalizedPath('zh', ['about']);
    expect(about).toMatchObject({ kind: 'page' });
    if (about?.kind === 'page') expect(about.page.locale).toBe('zh');
    expect(resolveLocalizedPath('zh', ['subscribe'])).toBeNull(); // default tree only
  });

  test('no aliases under a locale prefix', () => {
    // 1-segment and 2-segment redirectFrom aliases of the en post never
    // resolve under /zh/ — alias pages live at their unprefixed paths only.
    expect(resolveLocalizedPath('zh', ['this-is-a-test-redirect-for-the-art-of-algorithms'])).toBeNull();
    expect(resolveLocalizedPath('zh', ['this', 'is-a-test-redirect-for-the-art-of-algorithms'])).toBeNull();
  });

  test('unknown or default locales never resolve', () => {
    expect(resolveLocalizedPath('en', ['posts'])).toBeNull();
    expect(resolveLocalizedPath('fr', [])).toBeNull();
  });

  test('page numbers must be integers ≥ 2', () => {
    expect(resolveLocalizedPath('zh', ['posts', 'page', '1'])).toBeNull();
    expect(resolveLocalizedPath('zh', ['posts', 'page', 'x'])).toBeNull();
    expect(resolveLocalizedPath('zh', ['posts', 'page', '2'])).toMatchObject({ kind: 'postsListing', page: 2 });
  });
});

describe('locale params providers', () => {
  test('locale roots generated only for trees with content', () => {
    expect(localeHomeParams()).toEqual([{ slug: 'zh' }]);
  });

  test('second-level params cover pages, section roots, and series prefixes — sparsely', () => {
    const params = localeSecondLevelParams();
    const zhPairs = params.filter(p => p.slug === 'zh').map(p => p.postSlug);
    for (const expected of ['about', 'links', 'privacy', 'posts', 'series', 'books', 'zh-demo-series', 'markdown-showcase']) {
      expect(zhPairs).toContain(expected);
    }
    expect(zhPairs).not.toContain('notes');
    expect(zhPairs).not.toContain('nextjs-deep-dive');
    expect(zhPairs).not.toContain('subscribe');
    expect(params.every(p => p.slug === 'zh')).toBe(true); // never the default locale
  });

  test('deep params cover posts, series landings, and nothing the tree lacks', () => {
    const params = localeDeepParams();
    const paths = params.map(p => `/${p.slug}/${p.postSlug}/${p.rest.join('/')}`);
    expect(paths).toContain('/zh/posts/i18n-routing-considerations');
    expect(paths).toContain('/zh/posts/zh-original-demo');
    expect(paths).toContain('/zh/zh-demo-series/di-yi-pian');
    expect(paths).toContain('/zh/series/zh-demo-series');
    expect(paths).toContain('/zh/posts/page/2');
    expect(paths).toContain('/zh/books/sample-book');
    expect(paths).toContain('/zh/books/sample-book/introduction');
    // Only what the tree holds: one translated book, no notes.
    expect(paths.some(p => p.includes('/books/') && !p.includes('/books/sample-book'))).toBe(false);
    expect(paths.some(p => p.includes('/notes/'))).toBe(false);
  });

  test('every generated param resolves (provider ⊆ resolver)', () => {
    for (const { slug, postSlug } of localeSecondLevelParams()) {
      expect(resolveLocalizedPath(slug, [postSlug])).not.toBeNull();
    }
    for (const { slug, postSlug, rest } of localeDeepParams()) {
      expect(resolveLocalizedPath(slug, [postSlug, ...rest])).not.toBeNull();
    }
  });
});

describe('hasLocaleContent gates', () => {
  test('reflects what the zh tree actually holds', () => {
    expect(hasLocaleContent('zh', 'posts')).toBe(true);
    expect(hasLocaleContent('zh', 'pages')).toBe(true);
    expect(hasLocaleContent('zh', 'series')).toBe(true);
    expect(hasLocaleContent('zh', 'books')).toBe(true);
    expect(hasLocaleContent('zh', 'notes')).toBe(false);
    expect(hasLocaleContent('zh', 'any')).toBe(true);
  });
});

describe('getTwinnedPathManifest', () => {
  test('locale entries list what EXISTS in that locale, originals included', () => {
    const manifest = getTwinnedPathManifest();
    const zh = manifest.zh ?? [];
    for (const expected of [
      '/', '/posts/', '/series/', '/about/', '/links/', '/privacy/',
      '/posts/i18n-routing-considerations/',
      // Originals exist in zh — switching INTO zh from these paths is
      // unreachable from en, but the entries make zh↔zh checks uniform.
      '/posts/zh-original-demo/', '/series/zh-demo-series/', '/zh-demo-series/',
    ]) {
      expect(zh).toContain(expected);
    }
    expect(zh).toContain('/books/sample-book/');
    // Nothing the zh tree lacks.
    expect(zh).not.toContain('/books/notes-on-thinking/');
    expect(zh).not.toContain('/notes/');
    expect(zh).not.toContain('/subscribe/');
  });

  test('the default-locale entry lists only default-side paths reachable from a locale page', () => {
    const manifest = getTwinnedPathManifest();
    const en = manifest.en ?? [];
    for (const expected of ['/', '/posts/', '/series/', '/about/', '/links/', '/privacy/', '/posts/i18n-routing-considerations/']) {
      expect(en).toContain(expected);
    }
    // zh-originals have no default side — switching back falls to the home.
    expect(en).not.toContain('/posts/zh-original-demo/');
    expect(en).not.toContain('/series/zh-demo-series/');
    expect(en).not.toContain('/zh-demo-series/');
  });
});

describe('feature gates mirror the unprefixed routes', () => {
  test('kind → feature mapping is pinned', async () => {
    const { LOCALE_KIND_FEATURES } = await import('../../src/lib/locale-routes');
    // series/[slug] gates on `series`, books surfaces on `books`, notes
    // belong to `flow`; posts and pages are deliberately ungated (their
    // unprefixed routes have no isFeatureEnabled check).
    expect(LOCALE_KIND_FEATURES).toEqual({ series: 'series', books: 'books', notes: 'flow' });
  });
});
