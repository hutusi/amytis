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
 * Collapse `.` / `..` / empty segments of a site path. Returns null when the
 * path climbs above the site root (`/../x`). Dependency-free (no node:path)
 * because components share this module.
 */
function normalizeSitePath(sitePath: string): string | null {
  const segments: string[] = [];
  for (const segment of sitePath.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

/**
 * Public site path ('/posts/my-post/images/x.png') for an image src as
 * authored in content, or null when the src is not a local asset (external
 * URL, data: URI, fragment) or escapes its allowed root: a relative path must
 * stay inside the content's asset base, a site-absolute one inside the site.
 * The on-page pipeline resolves the result against public/ and reads the
 * file, so an escaping path would read outside public/.
 *
 * `slug` is the content's public-relative asset base (e.g. `posts/my-post`,
 * `books/my-book`, `flows/2026/01/15`): `./x.png` and bare `x.png` resolve
 * against it, `/x.png` is already site-absolute. Shared by the on-page image
 * pipeline (rehype-image-metadata) and feed rendering so a co-located image
 * resolves to the same file on both surfaces.
 */
export function resolveContentImagePath(src: string, slug?: string): string | null {
  if (!src || src.startsWith('http') || src.startsWith('//')) return null;
  if (src.startsWith('/')) return normalizeSitePath(src);
  if (!slug || src.startsWith('data:') || src.startsWith('#')) return null;
  const relative = src.startsWith('./') ? src.substring(2) : src;
  const base = normalizeSitePath(`/${slug}`);
  const resolved = normalizeSitePath(`/${slug}/${relative}`);
  if (!base || !resolved || !resolved.startsWith(`${base}/`)) return null;
  return resolved;
}
