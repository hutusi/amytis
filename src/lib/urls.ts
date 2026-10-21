import { siteConfig } from '../../site.config';
import { localizePath, splitLocalePath, type LocalePathConfig } from './locale-urls';

/** Strip leading and trailing slashes so path segments compose cleanly. */
function normalizeSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

// Top-level route segments reserved by the app — series slugs must not collide with these.
// `og` holds the generated share cards (src/app/og/).
export const RESERVED_ROUTE_SEGMENTS = new Set([
  'posts', 'series', 'books', 'flows', 'tags', 'authors', 'archive', 'notes', 'graph', 'search', 'page', 'api', 'og',
]);

export function getPostsBasePath(): string {
  return normalizeSegment(siteConfig.posts?.basePath ?? 'posts') || 'posts';
}

export function getSeriesCustomPaths(): Record<string, string> {
  const raw = siteConfig.series?.customPaths ?? {};
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, normalizeSegment(v)])
  );
}

export function getSeriesAutoPaths(): boolean {
  return siteConfig.series?.autoPaths ?? true;
}

// ─── locale-aware URL prefixes ───────────────────────────────────────────────

export function getDefaultLocale(): string {
  return siteConfig.i18n.defaultLocale;
}

/**
 * Locale codes that participate in URL routing: all configured locales while
 * i18n is enabled, none otherwise (a disabled-i18n site has no locale routes,
 * so its content may freely use segments like "en").
 */
export function getRouteLocales(): string[] {
  return siteConfig.i18n.enabled ? [...siteConfig.i18n.locales] : [];
}

/** Non-default locale codes that appear as URL prefixes (e.g. ['zh']). */
export function getNonDefaultLocales(): string[] {
  const defaultLocale = getDefaultLocale();
  return getRouteLocales().filter((locale) => locale !== defaultLocale);
}

export function isNonDefaultLocale(segment: string): boolean {
  return getNonDefaultLocales().includes(segment);
}

function urlLocaleConfig(): LocalePathConfig {
  return { locales: getRouteLocales(), defaultLocale: getDefaultLocale() };
}

/** `/posts/foo/` + `zh` → `/zh/posts/foo/`; identity for the default locale. */
export function localizeUrl(path: string, locale: string): string {
  return localizePath(path, locale, urlLocaleConfig());
}

/** `/zh/posts/foo/` → `{ locale: 'zh', path: '/posts/foo/' }`; unprefixed → default locale. */
export function splitLocaleFromPath(path: string): { locale: string; path: string } {
  return splitLocalePath(path, urlLocaleConfig());
}

/**
 * Reserved top-level segments including configured locale codes. The default
 * locale is reserved too — `/en/…` must stay unclaimable so a future
 * defaultLocale flip can't be shadowed by existing content.
 */
export function getReservedRouteSegments(): Set<string> {
  return new Set([...RESERVED_ROUTE_SEGMENTS, ...getRouteLocales()]);
}

/**
 * Validates that no series slug (without a customPaths override) conflicts with a reserved
 * top-level route or a static page slug. Throws a build-time error on collision so
 * misconfiguration is caught early.
 *
 * `extraReserved` accepts additional slugs to check (e.g. static page slugs from
 * getAllPages()) — passed by the caller to avoid a circular dependency between
 * urls.ts and markdown.ts.
 */
export function validateSeriesAutoPaths(seriesSlugs: string[], extraReserved: string[] = []): void {
  if (!getSeriesAutoPaths()) return;
  const customPaths = getSeriesCustomPaths();
  const basePath = getPostsBasePath();
  const reserved = new Set([...getReservedRouteSegments(), basePath, ...extraReserved]);

  for (const slug of seriesSlugs) {
    if (Object.hasOwn(customPaths, slug)) continue; // Has an explicit override — skip
    if (reserved.has(slug)) {
      const conflictsWith = getRouteLocales().includes(slug)
        ? `the configured locale prefix "/${slug}"`
        : `the reserved route "/${slug}"`;
      throw new Error(
        `[amytis] Series slug "${slug}" conflicts with ${conflictsWith}. ` +
        `Rename the series or add series.customPaths["${slug}"] = "..." to use a different URL prefix.`
      );
    }
  }
}

/** Returns the canonical URL path for a post, respecting series auto-paths, custom paths, and posts basePath. */
/**
 * Canonical form of a page URL under `trailingSlash: true`: the static export
 * serves `/path/index.html`, so `/path/` is the page and `/path` is a
 * redirecting variant. Use for URLs advertised to crawlers and feed readers
 * (sitemap entries, feed item links/ids, canonical/alternates, JSON-LD).
 * Only for page URLs — never for real files like /feed.xml.
 */
export function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export function getPostUrl(post: { slug: string; series?: string; locale?: string }): string {
  let url: string;
  if (post.series && getSeriesCustomPaths()[post.series]) {
    url = `/${getSeriesCustomPaths()[post.series]}/${post.slug}`;
  } else if (post.series && getSeriesAutoPaths()) {
    url = `/${post.series}/${post.slug}`;
  } else {
    url = `/${getPostsBasePath()}/${post.slug}`;
  }
  // Entity-carried locale: posts from a non-default tree live under /<locale>/…
  // Default-tree posts (locale absent or = default) keep byte-identical URLs,
  // which is what keeps feed GUIDs and graph node ids stable.
  return post.locale ? localizeUrl(url, post.locale) : url;
}

/** Returns the posts listing URL (page 1). */
export function getPostsListUrl(): string {
  return `/${getPostsBasePath()}`;
}

/** Returns a posts listing page URL (page 2+). */
export function getPostsPageUrl(page: number): string {
  return `/${getPostsBasePath()}/page/${page}`;
}

/** Returns the series listing URL. */
export function getSeriesListUrl(): string {
  return '/series';
}

/** Returns the books listing URL. */
export function getBooksListUrl(): string {
  return '/books';
}

/** Returns the canonical URL path for a series landing page. */
export function getSeriesUrl(slug: string): string {
  return `/series/${slug}`;
}

/** Returns the canonical URL path for a book landing page. */
export function getBookUrl(slug: string): string {
  return `/books/${slug}`;
}

/** Returns the canonical URL path for a book chapter. */
export function getBookChapterUrl(bookSlug: string, chapterSlug: string): string {
  return `/books/${bookSlug}/${chapterSlug}`;
}

/** Returns the canonical URL path for a flow note. */
export function getFlowUrl(slug: string): string {
  return `/flows/${slug}`;
}

/** Returns the canonical URL path for a knowledge-base note. */
export function getNoteUrl(slug: string): string {
  return `/notes/${slug}`;
}

/** Returns the canonical URL path for a static page (e.g. /about, /subscribe). */
export function getStaticPageUrl(slug: string): string {
  return `/${slug}`;
}

/** Returns the post URL with a ?collection= query param to preserve collection navigation context. */
export function getPostUrlInCollection(post: { slug: string; series?: string }, collectionSlug: string): string {
  return `${getPostUrl(post)}?${new URLSearchParams({ collection: collectionSlug }).toString()}`;
}

let cachedSiteHost: string | null | undefined;

function getSiteHost(): string | null {
  if (cachedSiteHost !== undefined) return cachedSiteHost;
  try {
    cachedSiteHost = new URL(siteConfig.baseUrl).host;
  } catch {
    cachedSiteHost = null;
  }
  return cachedSiteHost;
}

/**
 * True when `href` points to a different host than `siteConfig.baseUrl`.
 *
 * - `http://` / `https://` absolute URLs and protocol-relative `//host/...`
 *   are tested by host comparison.
 * - `mailto:`, `tel:`, `sms:`, `ftp:`, `javascript:` and other non-http
 *   schemes return false — they're "external" in spirit but have different
 *   click semantics and don't warrant an outward-arrow indicator.
 * - Hash-only (`#foo`), query-only (`?foo`), relative paths (`/foo`,
 *   `foo.md`), empty strings → false.
 * - Malformed URLs → false (defensive — don't decorate something we can't parse).
 */
export function isExternalUrl(href: string | undefined | null): boolean {
  if (!href) return false;
  if (href.startsWith('#') || href.startsWith('?')) return false;
  if (/^(mailto|tel|sms|ftp|javascript):/i.test(href)) return false;

  const siteHost = getSiteHost();
  if (!siteHost) return false;

  if (href.startsWith('//')) {
    // Prefix a dummy scheme so the URL parser handles auth (`//user:pass@host`),
    // port-only (`//:80`), and IPv6 forms correctly — substring splitting on
    // `/` is too coarse for any of those.
    try {
      return new URL(`https:${href}`).host !== siteHost;
    } catch {
      return false;
    }
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      return new URL(href).host !== siteHost;
    } catch {
      return false;
    }
  }
  return false;
}

/** Test-only: drop the cached site host so a test can re-read `siteConfig.baseUrl`. */
export function resetSiteHostCacheForTests(): void {
  cachedSiteHost = undefined;
}
