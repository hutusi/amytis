/**
 * Prepend a CDN base URL to a local image path.
 * External URLs (http/https) and special values (text:, data:) are returned as-is.
 */
export function getCdnImageUrl(src: string, cdnBaseUrl: string): string {
  if (!cdnBaseUrl || !src) return src;
  if (src.startsWith('http') || src.startsWith('//')) return src;
  if (src.startsWith('text:') || src.startsWith('data:')) return src;
  const base = cdnBaseUrl.replace(/\/$/, '');
  const path = src.startsWith('/') ? src : `/${src}`;
  return `${base}${path}`;
}

/**
 * Certain source formats should bypass next-image-export-optimizer entirely.
 * AVIF currently has an upstream path-generation bug when WEBP output is enabled,
 * and user-supplied WEBP files are often already optimized enough to serve directly.
 */
export function shouldBypassImageOptimization(src: string): boolean {
  if (!src) return false;
  const pathWithoutQuery = src.split('#')[0]?.split('?')[0] ?? src;
  return /\.(avif|webp)$/i.test(pathWithoutQuery);
}

/**
 * Public site path ('/posts/my-post/images/x.png') for an image src as
 * authored in content, or null when the src is not a local asset (external
 * URL, data: URI, fragment, or a `../` path that escapes the content root).
 *
 * `slug` is the content's public-relative asset base (e.g. `posts/my-post`,
 * `books/my-book`, `flows/2026/01/15`): `./x.png` and bare `x.png` resolve
 * against it, `/x.png` is already site-absolute. Shared by the on-page image
 * pipeline (rehype-image-metadata) and feed rendering so a co-located image
 * resolves to the same file on both surfaces.
 */
export function resolveContentImagePath(src: string, slug?: string): string | null {
  if (!src || src.startsWith('http') || src.startsWith('//')) return null;
  if (src.startsWith('./')) return slug ? `/${slug}/${src.substring(2)}` : null;
  if (src.startsWith('/')) return src;
  if (!slug || src.startsWith('../') || src.startsWith('data:') || src.startsWith('#')) return null;
  return `/${slug}/${src}`;
}
