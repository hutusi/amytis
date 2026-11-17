import { describe, expect, test } from 'bun:test';
import { bookContentLocales, chapterContentLocales, contentSeoUrls } from '../../src/lib/locale-routes';
import { generateMetadata as postsSlugMetadata } from '../../src/app/posts/[slug]/page';
import { generateMetadata as topLevelMetadata } from '../../src/app/[slug]/page';
import { generateMetadata as secondLevelMetadata } from '../../src/app/[slug]/[postSlug]/page';
import { generateMetadata as deepMetadata } from '../../src/app/[slug]/[postSlug]/[...rest]/page';
import { getAllBooks } from '../../src/lib/content/books';
import { siteConfig } from '../../site.config';

// Relies on the tracked zh fixtures: the twin post i18n-routing-considerations
// (en+zh), the zh-original zh-original-demo, the migrated zh pages, and the
// translated sample-book.

const base = siteConfig.baseUrl.replace(/\/+$/, '');

const twinCanonical = `${base}/posts/i18n-routing-considerations/`;
const twinLanguages = {
  en: `${base}/posts/i18n-routing-considerations/`,
  zh: `${base}/zh/posts/i18n-routing-considerations/`,
  'x-default': `${base}/posts/i18n-routing-considerations/`,
};

describe('contentSeoUrls', () => {
  test('twins are SELF-canonical on each side, sharing one languages set', () => {
    // Cross-language canonicals would tell Google to drop the translation
    // from the index (PR #125 review finding 5) — each side canonicalizes
    // to itself; hreflang + x-default connect the pair.
    const fromZh = contentSeoUrls('/zh/posts/foo', ['en', 'zh']);
    const fromEn = contentSeoUrls('/posts/foo', ['en', 'zh']);
    expect(fromZh.canonicalUrl).toBe(`${base}/zh/posts/foo/`);
    expect(fromEn.canonicalUrl).toBe(`${base}/posts/foo/`);
    for (const seo of [fromZh, fromEn]) {
      expect(seo.languageAlternates).toEqual({
        en: `${base}/posts/foo/`,
        zh: `${base}/zh/posts/foo/`,
        'x-default': `${base}/posts/foo/`,
      });
    }
  });

  test('locale-tree original → self-canonical /zh/ URL, no languages block', () => {
    const seo = contentSeoUrls('/zh/posts/bar', ['zh']);
    expect(seo.canonicalUrl).toBe(`${base}/zh/posts/bar/`);
    expect(seo.languageAlternates).toBeUndefined();
  });

  test('single-locale default entity → plain self-canonical, no languages block', () => {
    const seo = contentSeoUrls('/posts/baz', ['en']);
    expect(seo.canonicalUrl).toBe(`${base}/posts/baz/`);
    expect(seo.languageAlternates).toBeUndefined();
  });
});

describe('detail-route metadata: canonical split + hreflang', () => {
  test('posts/[slug] twin metadata: unprefixed canonical + en/zh/x-default', async () => {
    const md = await postsSlugMetadata({
      params: Promise.resolve({ slug: 'i18n-routing-considerations' }),
    });
    expect(md.alternates?.canonical).toBe(twinCanonical);
    expect(md.alternates?.languages).toEqual(twinLanguages);
  });

  test('[...rest] zh twin metadata is self-canonical with the shared languages set', async () => {
    const md = await deepMetadata({
      params: Promise.resolve({ slug: 'zh', postSlug: 'posts', rest: ['i18n-routing-considerations'] }),
    });
    expect(md.alternates?.canonical).toBe(`${base}/zh/posts/i18n-routing-considerations/`);
    expect(md.alternates?.languages).toEqual(twinLanguages);
    // Localized pages must not inherit the root layout's default og:locale.
    expect(md.openGraph?.locale).toBe('zh');
  });

  test('[...rest] zh-original metadata is self-canonical without languages', async () => {
    const md = await deepMetadata({
      params: Promise.resolve({ slug: 'zh', postSlug: 'posts', rest: ['zh-original-demo'] }),
    });
    expect(md.alternates?.canonical).toBe(`${base}/zh/posts/zh-original-demo/`);
    expect(md.alternates?.languages).toBeUndefined();
  });

  test('twin static page: each side self-canonical, same languages set', async () => {
    const enSide = await topLevelMetadata({ params: Promise.resolve({ slug: 'about' }) });
    const zhSide = await secondLevelMetadata({
      params: Promise.resolve({ slug: 'zh', postSlug: 'about' }),
    });
    expect(enSide.alternates?.canonical).toBe(`${base}/about/`);
    expect(zhSide.alternates?.canonical).toBe(`${base}/zh/about/`);
    expect(zhSide.openGraph?.locale).toBe('zh');
    // A page-level openGraph REPLACES the layout's — the override must carry
    // the full set, not just the locale (third review, finding 1).
    expect(zhSide.openGraph?.siteName).toBeTruthy();
    expect(zhSide.openGraph && 'images' in zhSide.openGraph && zhSide.openGraph.images).toBeTruthy();
    for (const md of [enSide, zhSide]) {
      expect(md.alternates?.languages).toEqual({
        en: `${base}/about/`,
        zh: `${base}/zh/about/`,
        'x-default': `${base}/about/`,
      });
    }
  });
});

describe('localized detail pages carry entity-specific OpenGraph', () => {
  test('the auto-prefix landing gets the same entity treatment as /zh/series/<slug>', async () => {
    const md = await secondLevelMetadata({
      params: Promise.resolve({ slug: 'zh', postSlug: 'zh-demo-series' }),
    });
    expect(md.openGraph?.locale).toBe('zh');
    expect(md.openGraph?.url).toBe(`${base}/zh/zh-demo-series/`);
    expect(md.alternates?.canonical).toBe(`${base}/zh/zh-demo-series/`);
    expect(md.openGraph?.siteName).toBeTruthy();
    expect(md.openGraph && 'images' in md.openGraph && md.openGraph.images).toBeTruthy();
  });

  test('zh series landing mirrors the unprefixed landing: og:url, type, locale, image', async () => {
    const md = await deepMetadata({
      params: Promise.resolve({ slug: 'zh', postSlug: 'series', rest: ['zh-demo-series'] }),
    });
    expect(md.openGraph?.locale).toBe('zh');
    expect(md.openGraph && 'type' in md.openGraph && md.openGraph.type).toBe('website');
    expect(md.openGraph?.url).toBe(`${base}/zh/series/zh-demo-series/`);
    expect(md.openGraph && 'images' in md.openGraph && md.openGraph.images).toBeTruthy();
    expect(md.openGraph?.siteName).toBeTruthy();
    expect(md.alternates?.canonical).toBe(`${base}/zh/series/zh-demo-series/`);
  });
});

describe('book/chapter locale sets', () => {
  test('a translated book and its chapters list both locales', () => {
    expect(bookContentLocales('sample-book')).toEqual([siteConfig.i18n.defaultLocale, 'zh']);
    expect(chapterContentLocales('sample-book', 'introduction')).toEqual([siteConfig.i18n.defaultLocale, 'zh']);
  });

  test('untranslated books resolve to a single-locale set → no languages block', () => {
    const books = getAllBooks().filter((book) => book.slug !== 'sample-book');
    expect(books.length).toBeGreaterThan(0);
    for (const book of books) {
      expect(bookContentLocales(book.slug)).toEqual([siteConfig.i18n.defaultLocale]);
    }
    // A chapter id no tree holds yields the empty set.
    expect(chapterContentLocales(books[0].slug, 'nonexistent-chapter')).toHaveLength(0);
  });
});
