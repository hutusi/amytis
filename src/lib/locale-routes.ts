import { siteConfig } from '../../site.config';
import type { PostData } from './content/types';
import {
  getAllPages,
  getAllPagesIncludingUnpublished,
  getAllPosts,
  getListingPosts,
  getPageBySlug,
  getTwinPage,
  getTwinPost,
} from './content/posts';
import { getAllSeries, getSeriesData } from './content/series';
import { getAllBooks, getBookChapter, getBookData, type BookChapterData, type BookData } from './content/books';
import { getAllNotes, getNoteBySlug, getTwinNote, type NoteData } from './content/notes';
import { createKeyedMemo } from './content/cache';
import {
  getBookChapterUrl,
  getBookUrl,
  getBooksListUrl,
  getNonDefaultLocales,
  getNoteUrl,
  getPostUrl,
  getPostsBasePath,
  getSeriesAutoPaths,
  getSeriesCustomPaths,
  getSeriesListUrl,
  getSeriesUrl,
  getStaticPageUrl,
  localizeUrl,
  splitLocaleFromPath,
  validateSeriesAutoPaths,
  withTrailingSlash,
} from './urls';
import { resolvePrefixedPost, resolveSeriesListingPrefix } from './route-aliases';
import { resolveFromParam, safeDecodeParam, withDevEncodedVariants } from './route-params';
import { isFeatureEnabled } from './features';

/**
 * The locale URL surface: /<locale>/… serves the SAME URL grammar as the
 * unprefixed tree, evaluated against that locale's content tree — a sparse
 * mirror that only contains what the tree actually holds. Structurally these
 * paths ride the existing [slug] dynamic routes (a sibling [locale] segment
 * is a Next build error), so this module is their single owner, mirroring
 * route-aliases.ts: *Params providers feed generateStaticParams, and
 * resolveLocalizedPath classifies requests. Nothing here touches the
 * unprefixed surface.
 *
 * Invariant: no redirectFrom alias pages are generated at locale-prefixed
 * paths — migration aliases live at their old unprefixed URLs.
 */

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;
const POST_PAGE_SIZE = siteConfig.pagination.posts;
const SERIES_PAGE_SIZE = siteConfig.pagination.series;
const NOTES_PAGE_SIZE = siteConfig.pagination.notes;

export type LocaleContentKind = 'any' | 'posts' | 'pages' | 'series' | 'books' | 'notes';

/**
 * Feature flag guarding each locale content kind, mirroring the unprefixed
 * routes exactly: /series and series/[slug] gate on `series`, books surfaces
 * on `books`, notes belong to the `flow` feature; posts and pages are
 * ungated. Exported so tests pin the mapping.
 */
export const LOCALE_KIND_FEATURES = { series: 'series', books: 'books', notes: 'flow' } as const;

function kindEnabled(kind: LocaleContentKind): boolean {
  const feature = (LOCALE_KIND_FEATURES as Partial<Record<LocaleContentKind, 'series' | 'books' | 'flow'>>)[kind];
  return feature ? isFeatureEnabled(feature) : true;
}

/** Sparse-generation gate: does this locale's tree hold content of a kind — and is the kind's feature enabled? */
export function hasLocaleContent(locale: string, kind: LocaleContentKind): boolean {
  if (!kindEnabled(kind)) return false;
  switch (kind) {
    case 'posts': return getListingPosts(locale).length > 0;
    case 'pages': return getAllPages(locale).length > 0;
    case 'series': return Object.keys(getAllSeries(locale)).length > 0;
    case 'books': return getAllBooks(locale).length > 0;
    case 'notes': return getAllNotes(locale).length > 0;
    case 'any':
      return (['posts', 'pages', 'series', 'books', 'notes'] as const).some(k => hasLocaleContent(locale, k));
  }
}

// ─── request-time resolution ─────────────────────────────────────────────────

export type LocalizedResolution =
  | { kind: 'localeHome'; locale: string }
  | { kind: 'page'; locale: string; page: PostData }
  | { kind: 'postsListing'; locale: string; page: number }
  | { kind: 'seriesIndexListing'; locale: string }
  | { kind: 'booksListing'; locale: string }
  | { kind: 'notesListing'; locale: string; page: number }
  // /<locale>/series/<slug>[/page/<n>] — mirrors series/[slug]/page.tsx
  | { kind: 'seriesPage'; locale: string; seriesSlug: string; page: number }
  // /<locale>/<prefix>[/page/<n>] — mirrors the [slug] series listing
  | { kind: 'seriesPrefixListing'; locale: string; seriesSlug: string; prefix: string; page: number }
  | { kind: 'post'; locale: string; post: PostData }
  | { kind: 'book'; locale: string; book: BookData }
  | { kind: 'chapter'; locale: string; book: BookData; chapter: BookChapterData }
  | { kind: 'note'; locale: string; note: NoteData }
  | null;

function parsePageNumber(raw: string): number | null {
  const decoded = safeDecodeParam(raw);
  if (!/^\d+$/.test(decoded)) return null;
  const page = Number(decoded);
  return page >= 2 ? page : null; // page 1 is the base URL, never /page/1
}

/**
 * Classify a locale-prefixed request. `segments` are the RAW path segments
 * AFTER the locale ("/zh/books/a/b" → ['books','a','b']). The grammar mirrors
 * the canonical URL grammar exactly; anything else — including alias paths —
 * resolves to null (404 under dynamicParams=false).
 */
export function resolveLocalizedPath(locale: string, segments: string[]): LocalizedResolution {
  if (locale === DEFAULT_LOCALE || !getNonDefaultLocales().includes(locale)) return null;

  const basePath = getPostsBasePath();
  const n = segments.length;

  if (n === 0) {
    return hasLocaleContent(locale, 'any') ? { kind: 'localeHome', locale } : null;
  }

  const first = safeDecodeParam(segments[0]);

  if (n === 1) {
    if (first === basePath) {
      return hasLocaleContent(locale, 'posts') ? { kind: 'postsListing', locale, page: 1 } : null;
    }
    if (first === 'series') {
      return hasLocaleContent(locale, 'series') ? { kind: 'seriesIndexListing', locale } : null;
    }
    if (first === 'books') {
      return hasLocaleContent(locale, 'books') ? { kind: 'booksListing', locale } : null;
    }
    if (first === 'notes') {
      return hasLocaleContent(locale, 'notes') ? { kind: 'notesListing', locale, page: 1 } : null;
    }
    const seriesSlug = resolveSeriesListingPrefix(first, locale);
    if (seriesSlug) {
      return { kind: 'seriesPrefixListing', locale, seriesSlug, prefix: first, page: 1 };
    }
    const page = resolveFromParam(segments[0], slug => getPageBySlug(slug, locale));
    if (page) return { kind: 'page', locale, page };
    return null;
  }

  if (first === 'series') {
    if (!kindEnabled('series')) return null; // mirrors series/[slug]'s feature gate
    if (n === 2) {
      const data = resolveFromParam(segments[1], slug => getSeriesData(slug, locale));
      return data ? { kind: 'seriesPage', locale, seriesSlug: data.slug, page: 1 } : null;
    }
    if (n === 4 && safeDecodeParam(segments[2]) === 'page') {
      const data = resolveFromParam(segments[1], slug => getSeriesData(slug, locale));
      const page = parsePageNumber(segments[3]);
      return data && page ? { kind: 'seriesPage', locale, seriesSlug: data.slug, page } : null;
    }
    return null;
  }

  if (first === 'books') {
    if (!kindEnabled('books')) return null; // mirrors books/[slug]'s feature gate
    const book = resolveFromParam(segments[1], slug => getBookData(slug, locale));
    if (!book) return null;
    if (n === 2) return { kind: 'book', locale, book };
    const chapterId = segments.slice(2).map(safeDecodeParam).join('/');
    const chapter = getBookChapter(book.slug, chapterId, locale);
    return chapter ? { kind: 'chapter', locale, book, chapter } : null;
  }

  if (first === 'notes') {
    if (!kindEnabled('notes')) return null; // notes belong to the `flow` feature, like notes/[slug]
    if (n === 2) {
      const note = resolveFromParam(segments[1], slug => getNoteBySlug(slug, locale));
      return note ? { kind: 'note', locale, note } : null;
    }
    if (n === 3 && safeDecodeParam(segments[1]) === 'page') {
      const page = parsePageNumber(segments[2]);
      return page && hasLocaleContent(locale, 'notes') ? { kind: 'notesListing', locale, page } : null;
    }
    return null;
  }

  // /<locale>/<basePath|prefix>/page/<n> — listing pagination
  if (n === 3 && safeDecodeParam(segments[1]) === 'page') {
    const page = parsePageNumber(segments[2]);
    if (!page) return null;
    if (first === basePath) {
      return hasLocaleContent(locale, 'posts') ? { kind: 'postsListing', locale, page } : null;
    }
    const seriesSlug = resolveSeriesListingPrefix(first, locale);
    return seriesSlug ? { kind: 'seriesPrefixListing', locale, seriesSlug, prefix: first, page } : null;
  }

  // /<locale>/<basePath|prefix>/<postSlug>
  if (n === 2) {
    const resolved = resolvePrefixedPost(segments[0], segments[1], locale);
    return resolved?.kind === 'canonical' ? { kind: 'post', locale, post: resolved.post } : null;
  }

  return null;
}

// ─── generateStaticParams providers ──────────────────────────────────────────

/** `[slug]` additions: the locale roots (/zh) of every locale tree with content. */
export function localeHomeParams(): { slug: string }[] {
  return getNonDefaultLocales()
    .filter(locale => hasLocaleContent(locale, 'any'))
    .map(locale => ({ slug: locale }));
}

/**
 * The URL prefix a series listing uses: its customPaths value, else (autoPaths)
 * the slug itself. Exported for the sitemap, which advertises the locale
 * mirror of each prefix listing.
 */
export function seriesListingPrefixes(locale: string): Array<{ prefix: string; seriesSlug: string }> {
  const customPaths = getSeriesCustomPaths();
  const customValues = new Set(Object.values(customPaths));
  const result: Array<{ prefix: string; seriesSlug: string }> = [];
  for (const seriesSlug of Object.keys(getAllSeries(locale))) {
    const customPath = customPaths[seriesSlug];
    if (customPath) {
      result.push({ prefix: customPath, seriesSlug });
      continue;
    }
    if (!getSeriesAutoPaths()) continue;
    if (customValues.has(seriesSlug)) continue; // collides with another series' custom path value
    result.push({ prefix: seriesSlug, seriesSlug });
  }
  return result;
}

/** Per-tree collision validation, mirroring prefixedPostParams for the default tree. */
function validateLocaleSeriesPaths(locale: string): void {
  if (!getSeriesAutoPaths()) return;
  const pageSlugSet = getAllPagesIncludingUnpublished(locale).map(p => p.slug);
  validateSeriesAutoPaths(Object.keys(getAllSeries(locale)), [
    ...pageSlugSet,
    ...Object.values(getSeriesCustomPaths()),
  ]);
}

/** `[slug]/[postSlug]` additions: /<locale>/<x> — pages, section roots, series prefixes. */
export function localeSecondLevelParams(): { slug: string; postSlug: string }[] {
  const params: { slug: string; postSlug: string }[] = [];
  for (const locale of getNonDefaultLocales()) {
    validateLocaleSeriesPaths(locale);
    for (const page of getAllPages(locale)) {
      params.push({ slug: locale, postSlug: page.slug });
    }
    if (hasLocaleContent(locale, 'posts')) params.push({ slug: locale, postSlug: getPostsBasePath() });
    if (hasLocaleContent(locale, 'series')) params.push({ slug: locale, postSlug: 'series' });
    if (hasLocaleContent(locale, 'books')) params.push({ slug: locale, postSlug: 'books' });
    if (hasLocaleContent(locale, 'notes')) params.push({ slug: locale, postSlug: 'notes' });
    for (const { prefix } of seriesListingPrefixes(locale)) {
      params.push({ slug: locale, postSlug: prefix });
    }
  }
  return withDevEncodedVariants(params);
}

/** `[slug]/[postSlug]/[...rest]`: every ≥3-segment locale path. */
export function localeDeepParams(): { slug: string; postSlug: string; rest: string[] }[] {
  const params: { slug: string; postSlug: string; rest: string[] }[] = [];
  const push = (locale: string, unprefixedUrl: string) => {
    const segments = unprefixedUrl.split('/').filter(Boolean);
    if (segments.length < 2) return; // defensive: deep params only
    params.push({ slug: locale, postSlug: segments[0], rest: segments.slice(1) });
  };

  for (const locale of getNonDefaultLocales()) {
    // Posts — canonical URLs, derived from the same grammar the resolver checks.
    for (const post of getAllPosts(locale)) {
      const [, ...segments] = getPostUrl(post).split('/').filter(Boolean); // drop the locale segment
      push(locale, `/${segments.join('/')}`);
    }

    // Posts-listing pagination by the TREE's own count.
    const postCount = getListingPosts(locale).length;
    for (let i = 2; i <= Math.ceil(postCount / POST_PAGE_SIZE); i++) {
      push(locale, `/${getPostsBasePath()}/page/${i}`);
    }

    // Series landings (+ pagination) mirror series/[slug]'s feature gate;
    // prefix listings are ungated like the unprefixed [slug] surface.
    const allSeries = getAllSeries(locale);
    if (kindEnabled('series')) {
      for (const [seriesSlug, posts] of Object.entries(allSeries)) {
        push(locale, getSeriesUrl(seriesSlug));
        const totalPages = Math.ceil(posts.length / SERIES_PAGE_SIZE);
        for (let i = 2; i <= totalPages; i++) {
          push(locale, `${getSeriesUrl(seriesSlug)}/page/${i}`);
        }
      }
    }
    for (const { prefix, seriesSlug } of seriesListingPrefixes(locale)) {
      const totalPages = Math.ceil((allSeries[seriesSlug]?.length ?? 0) / SERIES_PAGE_SIZE);
      for (let i = 2; i <= totalPages; i++) {
        push(locale, `/${prefix}/page/${i}`);
      }
    }

    // Books and chapters.
    if (kindEnabled('books')) {
      for (const book of getAllBooks(locale)) {
        push(locale, getBookUrl(book.slug));
        for (const ch of book.chapters) {
          if (getBookChapter(book.slug, ch.id, locale) !== null) {
            push(locale, getBookChapterUrl(book.slug, ch.id));
          }
        }
      }
    }

    // Notes (+ pagination).
    if (kindEnabled('notes')) {
      const notes = getAllNotes(locale);
      for (const note of notes) {
        push(locale, getNoteUrl(note.slug));
      }
      for (let i = 2; i <= Math.ceil(notes.length / NOTES_PAGE_SIZE); i++) {
        push(locale, `/notes/page/${i}`);
      }
    }
  }
  return params;
}

// ─── LanguageSwitch manifest ─────────────────────────────────────────────────

interface LocalePathSets {
  /** Every unprefixed-form path that exists in this locale's tree/chrome. */
  all: string[];
  /** The subset whose default-tree counterpart also exists. */
  twinnedWithDefault: string[];
}

const pathSetsMemo = createKeyedMemo<string, LocalePathSets>();

/**
 * Path sets for one non-default locale. `all` powers switching INTO the
 * locale ("does the target have this page?") — including locale originals
 * and twins between two non-default trees; `twinnedWithDefault` powers
 * switching back to the default locale.
 */
function localePathSets(locale: string): LocalePathSets {
  return pathSetsMemo.get(locale, () => {
    const all = new Set<string>();
    const twinned = new Set<string>();
    const add = (unprefixedUrl: string, existsInDefault: boolean) => {
      const path = withTrailingSlash(unprefixedUrl);
      all.add(path);
      if (existsInDefault) twinned.add(path);
    };

    // Chrome roots: this locale's side per its own gates; the DEFAULT side is
    // route existence — /posts, /series etc. are static routes that exist
    // (possibly empty) whenever their feature is enabled, even on a
    // locale-only site with an empty default tree. Pagination stays
    // content-driven on both sides.
    if (hasLocaleContent(locale, 'any')) add('/', true);
    if (hasLocaleContent(locale, 'posts')) {
      add(`/${getPostsBasePath()}`, true);
      const localePages = Math.ceil(getListingPosts(locale).length / POST_PAGE_SIZE);
      const defaultPages = Math.ceil(getListingPosts().length / POST_PAGE_SIZE);
      for (let i = 2; i <= localePages; i++) add(`/${getPostsBasePath()}/page/${i}`, i <= defaultPages);
    }
    if (hasLocaleContent(locale, 'series')) add(getSeriesListUrl(), kindEnabled('series'));
    if (hasLocaleContent(locale, 'books')) add(getBooksListUrl(), kindEnabled('books'));
    if (hasLocaleContent(locale, 'notes')) {
      add('/notes', kindEnabled('notes'));
      const localePages = Math.ceil(getAllNotes(locale).length / NOTES_PAGE_SIZE);
      const defaultPages = Math.ceil(getAllNotes().length / NOTES_PAGE_SIZE);
      for (let i = 2; i <= localePages; i++) add(`/notes/page/${i}`, i <= defaultPages);
    }

    for (const post of getAllPosts(locale)) {
      const { path } = splitLocaleFromPath(getPostUrl(post));
      add(path, getTwinPost(post, DEFAULT_LOCALE) !== null);
    }
    for (const page of getAllPages(locale)) {
      add(getStaticPageUrl(page.slug), getTwinPage(page, DEFAULT_LOCALE) !== null);
    }
    if (kindEnabled('notes')) {
      for (const note of getAllNotes(locale)) {
        add(getNoteUrl(note.slug), getTwinNote(note, DEFAULT_LOCALE) !== null);
      }
    }
    for (const [seriesSlug, localePosts] of Object.entries(getAllSeries(locale))) {
      const hasDefault = getSeriesData(seriesSlug, DEFAULT_LOCALE) !== null;
      const localePages = Math.ceil(localePosts.length / SERIES_PAGE_SIZE);
      const defaultPages = Math.ceil((getAllSeries(DEFAULT_LOCALE)[seriesSlug]?.length ?? 0) / SERIES_PAGE_SIZE);
      if (kindEnabled('series')) {
        add(getSeriesUrl(seriesSlug), hasDefault);
        for (let i = 2; i <= localePages; i++) {
          add(`${getSeriesUrl(seriesSlug)}/page/${i}`, hasDefault && i <= defaultPages);
        }
      }
      const prefix = seriesListingPrefixes(locale).find(p => p.seriesSlug === seriesSlug)?.prefix;
      if (prefix) {
        add(`/${prefix}`, hasDefault);
        for (let i = 2; i <= localePages; i++) {
          add(`/${prefix}/page/${i}`, hasDefault && i <= defaultPages);
        }
      }
    }
    if (kindEnabled('books')) {
      for (const book of getAllBooks(locale)) {
        const twinBook = getBookData(book.slug, DEFAULT_LOCALE);
        add(getBookUrl(book.slug), twinBook !== null);
        const twinChapterIds = new Set(twinBook?.chapters.map(ch => ch.id) ?? []);
        for (const ch of book.chapters) {
          add(getBookChapterUrl(book.slug, ch.id), twinChapterIds.has(ch.id));
        }
      }
    }

    return { all: [...all].sort(), twinnedWithDefault: [...twinned].sort() };
  });
}

/**
 * Per-locale switch manifest, passed through the root layout. Each
 * non-default key lists the unprefixed-form paths EXISTING in that locale;
 * the default-locale key lists the default-side paths reachable from any
 * locale page (union of twinned sets). resolveSwitchTarget checks the
 * TARGET's entry uniformly, which is what makes switching between two
 * non-default locales work without a default-tree twin.
 */
export function getTwinnedPathManifest(): Record<string, string[]> {
  const manifest: Record<string, string[]> = {};
  const defaultReachable = new Set<string>();
  for (const locale of getNonDefaultLocales()) {
    const sets = localePathSets(locale);
    if (sets.all.length > 0) manifest[locale] = sets.all;
    for (const path of sets.twinnedWithDefault) defaultReachable.add(path);
  }
  if (defaultReachable.size > 0) manifest[DEFAULT_LOCALE] = [...defaultReachable].sort();
  return manifest;
}

// ─── SEO URL derivation ──────────────────────────────────────────────────────

/**
 * Canonical + hreflang set for a content entity. `entityUrl` is its own
 * (possibly locale-prefixed) URL; `locales` from get*ContentLocales().
 *
 * Every language version is SELF-canonical — Google treats rel=canonical as
 * "index that page instead", so a translation pointing at its counterpart
 * would be dropped from the index entirely. Twins are connected by
 * reciprocal alternates.languages with x-default = the unprefixed URL;
 * single-locale entities carry no languages block.
 */
export function contentSeoUrls(entityUrl: string, locales: string[]): {
  canonicalUrl: string;
  languageAlternates?: Record<string, string>;
} {
  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const { path: unprefixed } = splitLocaleFromPath(entityUrl);
  const canonicalUrl = withTrailingSlash(`${siteUrl}${entityUrl}`);
  if (locales.length < 2) return { canonicalUrl };
  const languageAlternates: Record<string, string> = {};
  for (const locale of locales) {
    languageAlternates[locale] = withTrailingSlash(`${siteUrl}${localizeUrl(unprefixed, locale)}`);
  }
  languageAlternates['x-default'] = withTrailingSlash(`${siteUrl}${unprefixed}`);
  return { canonicalUrl, languageAlternates };
}

/** Locales whose tree holds this book (default first) — hreflang input for book landings. */
export function bookContentLocales(bookSlug: string): string[] {
  return [DEFAULT_LOCALE, ...getNonDefaultLocales()].filter(
    locale => getBookData(bookSlug, locale) !== null
  );
}

/** Locales holding both the book and this chapter — hreflang input for chapter pages. */
export function chapterContentLocales(bookSlug: string, chapterId: string): string[] {
  return bookContentLocales(bookSlug).filter(
    locale => getBookChapter(bookSlug, chapterId, locale) !== null
  );
}
