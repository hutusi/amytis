import { siteConfig } from '../../site.config';

/** Strip leading and trailing slashes so path segments compose cleanly. */
function normalizeSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

// Top-level route segments reserved by the app — series slugs must not collide with these.
const RESERVED_ROUTE_SEGMENTS = new Set([
  'series', 'books', 'flows', 'tags', 'authors', 'archive', 'notes', 'graph', 'page', 'api',
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
  return siteConfig.series?.autoPaths ?? false;
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
    if (slug in customPaths) continue; // Has an explicit override — skip
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

/** Returns the canonical URL path for a static page (e.g. /about, /subscribe). */
export function getStaticPageUrl(slug: string): string {
  return `/${slug}`;
}

/** Returns the post URL with a ?collection= query param to preserve collection navigation context. */
export function getPostUrlInCollection(post: { slug: string; series?: string }, collectionSlug: string): string {
  return `${getPostUrl(post)}?${new URLSearchParams({ collection: collectionSlug }).toString()}`;
}
