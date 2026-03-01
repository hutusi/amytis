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
