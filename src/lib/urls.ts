import { siteConfig } from '../../site.config';

/** Strip leading and trailing slashes so path segments compose cleanly. */
function normalizeSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

// Top-level route segments reserved by the app — series slugs must not collide with these.
export const RESERVED_ROUTE_SEGMENTS = new Set([
  'posts', 'series', 'books', 'flows', 'tags', 'authors', 'archive', 'notes', 'graph', 'search', 'page', 'api',
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
  const reserved = new Set([...RESERVED_ROUTE_SEGMENTS, basePath, ...extraReserved]);

  for (const slug of seriesSlugs) {
    if (Object.hasOwn(customPaths, slug)) continue; // Has an explicit override — skip
    if (reserved.has(slug)) {
      throw new Error(
        `[amytis] Series slug "${slug}" conflicts with the reserved route "/${slug}". ` +
        `Rename the series or add series.customPaths["${slug}"] = "..." to use a different URL prefix.`
      );
    }
  }
}

/** Returns the canonical URL path for a post, respecting series auto-paths, custom paths, and posts basePath. */
export function getPostUrl(post: { slug: string; series?: string }): string {
  if (post.series) {
    const customPath = getSeriesCustomPaths()[post.series];
    if (customPath) return `/${customPath}/${post.slug}`;
    if (getSeriesAutoPaths()) return `/${post.series}/${post.slug}`;
  }
  return `/${getPostsBasePath()}/${post.slug}`;
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
