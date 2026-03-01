import { siteConfig } from '../../site.config';

/** Strip leading and trailing slashes so path segments compose cleanly. */
function normalizeSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

export function getPostsBasePath(): string {
  return normalizeSegment(siteConfig.posts?.basePath ?? 'posts') || 'posts';
}

export function getSeriesCustomPaths(): Record<string, string> {
  const raw = siteConfig.series?.customPaths ?? {};
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, normalizeSegment(v)])
  );
}

/** Returns the canonical URL path for a post, respecting series custom paths and posts basePath. */
export function getPostUrl(post: { slug: string; series?: string }): string {
  if (post.series) {
    const customPath = getSeriesCustomPaths()[post.series];
    if (customPath) return `/${customPath}/${post.slug}`;
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
