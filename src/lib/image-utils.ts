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
