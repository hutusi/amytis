import { siteConfig } from '../../site.config';
import type { PostData } from './content/types';
import { getAllPages, getAllPosts, getListingPosts, getPageBySlug, getPostBySlug } from './content/posts';
import { getAllSeries, getSeriesData, getSeriesPosts } from './content/series';
import { createKeyedMemo } from './content/cache';
import {
  getPostsBasePath,
  getSeriesCustomPaths,
  getSeriesAutoPaths,
  validateSeriesAutoPaths,
  getPostUrl,
  getSeriesListUrl,
  RESERVED_ROUTE_SEGMENTS,
} from './urls';
import { safeDecodeParam, resolveFromParam } from './route-params';

/**
 * The dynamic alias surface — the single owner of how `[slug]`,
 * `[slug]/page/[page]`, `[slug]/[postSlug]`, and the `series/[slug]`
 * redirect aliases resolve. Routes stay thin adapters: their
 * `generateStaticParams` call the *Params providers, and their
 * metadata/page bodies classify the request via the resolve* functions.
 *
 * Strict-build invariant: every collision (a redirectFrom alias shadowing
 * a real route, two series claiming one alias) THROWS at export time —
 * never a silent skip. The throwing logic lives in pure `collect*` cores
 * so tests can exercise collisions with synthetic data.
 */

const POST_PAGE_SIZE = siteConfig.pagination.posts;
const SERIES_PAGE_SIZE = siteConfig.pagination.series;

// ─── series redirectFrom lookup (absorbed from series-redirects.ts) ──────────

function normalizeRedirectPath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;

  try {
    const decoded = decodeURIComponent(trimmed);
    return decoded.startsWith('/') ? decoded : `/${decoded}`;
  } catch {
    return null;
  }
}

const seriesRedirectMemo = createKeyedMemo<string, { slug: string; data: PostData } | null>();

export function findSeriesByRedirectFrom(path: string): { slug: string; data: PostData } | null {
  const normalizedPath = normalizeRedirectPath(path);
  if (!normalizedPath) return null;

  // Memoized: routes ask 2–3 times per request (params, metadata, page body).
  return seriesRedirectMemo.get(normalizedPath, () => {
    for (const seriesSlug of Object.keys(getAllSeries())) {
      const data = getSeriesData(seriesSlug);
      if (!data) continue;

      const hasRedirect = (data.redirectFrom ?? []).some((redirectFrom) => {
        const normalizedRedirect = normalizeRedirectPath(redirectFrom);
        return normalizedRedirect === normalizedPath;
      });

      if (hasRedirect) {
        return { slug: seriesSlug, data };
      }
    }

    return null;
  });
}

// ─── pure cores (the throws live here, testable with synthetic data) ─────────

/**
 * Single-segment redirectFrom aliases for `[slug]`. Throws when an alias
 * collides with a reserved slug (static page, listing prefix, reserved
 * route segment) or with an alias already claimed by another post.
 * Mutates `reservedSlugs` so subsequent aliases see earlier claims.
 */
export function collectSingleSegmentAliases(
  posts: Array<Pick<PostData, 'slug' | 'series' | 'redirectFrom'>>,
  reservedSlugs: Set<string>,
): string[] {
  const aliases: string[] = [];
  for (const post of posts) {
    for (const from of post.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 1) continue;
      if (from === getPostUrl(post)) continue;
      const alias = segments[0];
      if (reservedSlugs.has(alias)) {
        throw new Error(
          `[amytis] redirectFrom "${from}" in post "${post.slug}" conflicts with an existing top-level route or redirect alias.`
        );
      }
      reservedSlugs.add(alias);
      aliases.push(alias);
    }
  }
  return aliases;
}

/**
 * Paginated series aliases for `series/[slug]/page/[page]`. Returns
 * alias slug → totalPages for every redirectFrom alias of a multi-page
 * series. Throws when one alias is claimed by two series or shadows an
 * existing series slug.
 */
export function collectSeriesPageAliases(
  series: Array<{ slug: string; totalPages: number; redirectFrom: string[] }>,
): Map<string, number> {
  const seriesBase = getSeriesListUrl().replace(/^\/+|\/+$/g, '');
  const reservedSlugs = new Set(series.map(s => s.slug));
  const claimedAliases = new Map<string, string>();
  const aliasPages = new Map<string, number>();

  for (const { slug, totalPages, redirectFrom } of series) {
    for (const from of redirectFrom) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 2 || segments[0] !== seriesBase) continue;
      const aliasSlug = segments[1];
      if (aliasSlug === slug || totalPages <= 1) continue;
      const claimedBy = claimedAliases.get(aliasSlug);
      if (claimedBy && claimedBy !== slug) {
        throw new Error(
          `[amytis] series redirectFrom alias "${from}" is claimed by both "${claimedBy}" and "${slug}".`
        );
      }
      if (!claimedBy && reservedSlugs.has(aliasSlug)) {
        throw new Error(
          `[amytis] series redirectFrom alias "${from}" for "${slug}" conflicts with an existing series slug.`
        );
      }
      claimedAliases.set(aliasSlug, slug);
      reservedSlugs.add(aliasSlug);
      aliasPages.set(aliasSlug, totalPages);
    }
  }
  return aliasPages;
}

// ─── generateStaticParams providers ──────────────────────────────────────────

/** `[slug]`: pages + custom basePath + series custom/auto paths + 1-segment redirectFrom. */
export function topLevelSlugParams(): { slug: string }[] {
  const pages = getAllPages();
  const params = pages.map((page) => ({ slug: page.slug }));

  // Add custom posts basePath listing (e.g. /articles)
  const basePath = getPostsBasePath();
  if (basePath !== 'posts') {
    params.push({ slug: basePath });
  }

  // Add series custom path listings (e.g. /weeklies)
  const customPaths = getSeriesCustomPaths();
  for (const customPath of Object.values(customPaths)) {
    params.push({ slug: customPath });
  }

  // Add series auto-path listings (e.g. /my-series) when autoPaths is enabled
  const customPathValues = new Set(Object.values(customPaths));
  const autoPathSlugs: string[] = [];
  if (getSeriesAutoPaths()) {
    for (const seriesSlug of Object.keys(getAllSeries())) {
      if (Object.hasOwn(customPaths, seriesSlug)) continue; // series has its own customPaths key override — skip
      if (customPathValues.has(seriesSlug)) continue; // slug collides with another series' custom path value — skip
      autoPathSlugs.push(seriesSlug);
      params.push({ slug: seriesSlug });
    }
  }

  // Single-segment redirectFrom paths (e.g. /old-slug); collisions throw.
  const reservedSlugs = new Set([
    ...pages.map(p => p.slug),
    basePath,
    ...Object.values(customPaths),
    ...autoPathSlugs,
    ...RESERVED_ROUTE_SEGMENTS,
  ]);
  for (const alias of collectSingleSegmentAliases(getAllPosts(), reservedSlugs)) {
    params.push({ slug: alias });
  }

  return params;
}

/** `[slug]/page/[page]`: pagination (page 2+) for custom basePath and series listings. */
export function prefixedPageParams(): { slug: string; page: string }[] {
  const params: { slug: string; page: string }[] = [];

  // Custom posts basePath — paginated listing pages (page 2+)
  const basePath = getPostsBasePath();
  if (basePath !== 'posts') {
    const allPosts = getListingPosts();
    const totalPages = Math.ceil(allPosts.length / POST_PAGE_SIZE);
    for (let i = 2; i <= totalPages; i++) {
      params.push({ slug: basePath, page: i.toString() });
    }
  }

  // Series custom paths — paginated series listing (page 2+)
  const customPaths = getSeriesCustomPaths();
  for (const [seriesSlug, customPath] of Object.entries(customPaths)) {
    const posts = getSeriesPosts(seriesSlug);
    const totalPages = Math.ceil(posts.length / SERIES_PAGE_SIZE);
    for (let i = 2; i <= totalPages; i++) {
      params.push({ slug: customPath, page: i.toString() });
    }
  }

  // Series auto-paths — paginated series listing (page 2+)
  const customPathValues = new Set(Object.values(customPaths));
  if (getSeriesAutoPaths()) {
    for (const [seriesSlug, posts] of Object.entries(getAllSeries())) {
      if (Object.hasOwn(customPaths, seriesSlug)) continue; // series has its own customPaths key override — skip
      if (customPathValues.has(seriesSlug)) continue; // slug collides with another series' custom path value — skip
      const totalPages = Math.ceil(posts.length / SERIES_PAGE_SIZE);
      for (let i = 2; i <= totalPages; i++) {
        params.push({ slug: seriesSlug, page: i.toString() });
      }
    }
  }

  // Work around Next dev static-param checks for percent-encoded Unicode slugs
  // under `output: "export"` — dev server may receive encoded forms of the
  // prefix segment for paginated listings.
  if (process.env.NODE_ENV !== 'production') {
    const existing = new Set(params.map(p => `${p.slug}/${p.page}`));
    for (const p of [...params]) {
      const encodedSlug = encodeURIComponent(p.slug);
      const key = `${encodedSlug}/${p.page}`;
      if (!existing.has(key)) {
        existing.add(key);
        params.push({ slug: encodedSlug, page: p.page });
      }
    }
  }

  // Placeholder keeps Next.js happy with output: export when no custom paths configured.
  // dynamicParams = false ensures any unrecognised slug/page combo returns 404.
  return params.length > 0 ? params : [{ slug: '_', page: '2' }];
}

/** `[slug]/[postSlug]`: posts under custom basePath / series paths + 2-segment redirectFrom. */
export function prefixedPostParams(): { slug: string; postSlug: string }[] {
  const params: { slug: string; postSlug: string }[] = [];

  // Custom posts basePath — all posts served at /[basePath]/[slug]
  const basePath = getPostsBasePath();
  if (basePath !== 'posts') {
    getAllPosts().forEach(post => { params.push({ slug: basePath, postSlug: post.slug }); });
  }

  // Series custom paths — only posts belonging to that series
  const customPaths = getSeriesCustomPaths();
  for (const [seriesSlug, customPath] of Object.entries(customPaths)) {
    getSeriesPosts(seriesSlug).forEach(post => { params.push({ slug: customPath, postSlug: post.slug }); });
  }

  // Series auto-paths — use series slug as URL prefix for posts in that series
  if (getSeriesAutoPaths()) {
    const allSeriesMap = getAllSeries();
    const allSeriesSlugs = Object.keys(allSeriesMap);
    const pageSlugSet = getAllPages().map(p => p.slug);
    validateSeriesAutoPaths(allSeriesSlugs, [...pageSlugSet, ...Object.values(customPaths)]); // Throws if any slug collides with a reserved route, static page, or customPaths prefix
    for (const seriesSlug of allSeriesSlugs) {
      if (Object.hasOwn(customPaths, seriesSlug)) continue; // Already handled by customPaths above
      allSeriesMap[seriesSlug].forEach(post => { params.push({ slug: seriesSlug, postSlug: post.slug }); });
    }
  }

  // redirectFrom entries — generate redirect pages for 2-segment old paths
  for (const post of getAllPosts()) {
    for (const from of post.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 2) continue;
      const [fromPrefix, fromPostSlug] = segments;
      if (from === getPostUrl(post)) continue;   // skip if this is already the canonical path
      // Skip /posts/* entries when basePath is 'posts' — handled by posts/[slug]/page.tsx instead
      if (fromPrefix === 'posts' && basePath === 'posts') continue;
      params.push({ slug: fromPrefix, postSlug: fromPostSlug });
    }
  }

  // Work around Next dev static-param checks for percent-encoded Unicode slugs
  // under `output: "export"` — dev server may receive encoded forms of either segment.
  // Include encoded variants in development only; production export keeps raw segment values.
  if (process.env.NODE_ENV !== 'production') {
    const existing = new Set(params.map(p => `${p.slug}/${p.postSlug}`));
    for (const p of [...params]) {
      const encodedSlug = encodeURIComponent(p.slug);
      const encodedPostSlug = encodeURIComponent(p.postSlug);
      const variants = [
        { slug: p.slug, postSlug: encodedPostSlug },
        { slug: encodedSlug, postSlug: p.postSlug },
        { slug: encodedSlug, postSlug: encodedPostSlug },
      ];

      for (const variant of variants) {
        const key = `${variant.slug}/${variant.postSlug}`;
        if (!existing.has(key)) {
          existing.add(key);
          params.push(variant);
        }
      }
    }
  }

  // Placeholder keeps Next.js happy with output: export when no custom paths configured.
  // dynamicParams = false ensures any unrecognised slug/postSlug combo returns 404.
  return params.length > 0 ? params : [{ slug: '_', postSlug: '_' }];
}

/** `series/[slug]`: canonical series slugs + redirectFrom aliases (+ dev-encoded variants). */
export function seriesSlugParams(): { slug: string }[] {
  const allSeries = getAllSeries();
  const slugs = new Set(Object.keys(allSeries));

  // Also include old slugs from redirectFrom entries at /series/[old-slug].
  for (const seriesSlug of Object.keys(allSeries)) {
    const data = getSeriesData(seriesSlug);
    for (const from of data?.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 2 || segments[0] !== 'series') continue;
      if (from === `/series/${seriesSlug}`) continue;
      slugs.add(segments[1]);
    }
  }

  // Work around Next dev static-param checks for percent-encoded Unicode paths
  // under `output: "export"` — dev server may receive encoded forms of Unicode slugs.
  if (process.env.NODE_ENV !== 'production') {
    for (const slug of [...slugs]) {
      slugs.add(encodeURIComponent(slug));
    }
  }

  if (slugs.size === 0) return [{ slug: '_' }];
  return Array.from(slugs).map((slug) => ({ slug }));
}

/** `series/[slug]/page/[page]`: pagination (page 2+) for series and their aliases. */
export function seriesPageParams(): { slug: string; page: string }[] {
  const allSeries = getAllSeries();
  const seen = new Set<string>();
  const params: { slug: string; page: string }[] = [];
  const pushParam = (slug: string, page: string) => {
    const key = `${slug}:${page}`;
    if (seen.has(key)) return;
    seen.add(key);
    params.push({ slug, page });
  };

  const seriesEntries = Object.keys(allSeries).map(slug => ({
    slug,
    totalPages: Math.ceil(allSeries[slug].length / SERIES_PAGE_SIZE),
    redirectFrom: getSeriesData(slug)?.redirectFrom ?? [],
  }));

  for (const { slug, totalPages } of seriesEntries) {
    for (let i = 2; i <= totalPages; i++) {
      pushParam(slug, i.toString());
    }
  }

  for (const [aliasSlug, totalPages] of collectSeriesPageAliases(seriesEntries)) {
    for (let i = 2; i <= totalPages; i++) {
      pushParam(aliasSlug, i.toString());
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const encodedParams = params
      .filter(param => encodeURIComponent(param.slug) !== param.slug)
      .map(param => ({ ...param, slug: encodeURIComponent(param.slug) }))
      .filter(param => {
        const key = `${param.slug}:${param.page}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    params.push(...encodedParams);
  }

  if (params.length === 0) return [{ slug: '_', page: '2' }];
  return params;
}

// ─── request-time resolution ─────────────────────────────────────────────────

/** Map a `[slug]` / `[slug]/page/[page]` prefix to the series it lists, if any. */
export function resolveSeriesListingPrefix(prefix: string): string | undefined {
  const customPaths = getSeriesCustomPaths();
  return (
    Object.entries(customPaths).find(([, path]) => path === prefix)?.[0] ??
    (getSeriesAutoPaths() && !Object.hasOwn(customPaths, prefix) && getSeriesData(prefix) ? prefix : undefined)
  );
}

export type TopLevelResolution =
  | { kind: 'postsListing'; basePath: string }
  // `prefix` is the decoded request slug (the custom path, e.g. "weeklies"),
  // which differs from `seriesSlug` when series.customPaths is configured —
  // pagination links must stay on the prefix, not the series slug.
  | { kind: 'seriesListing'; seriesSlug: string; prefix: string }
  | { kind: 'page'; page: PostData }
  | { kind: 'redirect'; post: PostData; to: string }
  | null;

/**
 * Classify a top-level `[slug]` request. Resolution order is load-bearing:
 * custom basePath → series listing → static page → 1-segment redirectFrom
 * (a real page always beats an alias, so aliases can't hijack pages).
 */
export function resolveTopLevelSlug(rawSlug: string): TopLevelResolution {
  const slug = safeDecodeParam(rawSlug);

  const basePath = getPostsBasePath();
  if (slug === basePath && basePath !== 'posts') {
    return { kind: 'postsListing', basePath };
  }

  const seriesSlug = resolveSeriesListingPrefix(slug);
  if (seriesSlug) {
    return { kind: 'seriesListing', seriesSlug, prefix: slug };
  }

  const page = getPageBySlug(slug);
  if (page) {
    return { kind: 'page', page };
  }

  const redirectPost = getAllPosts().find(p => p.redirectFrom?.includes(`/${slug}`));
  if (redirectPost) {
    return { kind: 'redirect', post: redirectPost, to: getPostUrl(redirectPost) };
  }

  return null;
}

export type PrefixedPostResolution =
  | { kind: 'canonical'; post: PostData }
  | { kind: 'redirect'; post: PostData; to: string }
  | null;

/**
 * Resolve a `[slug]/[postSlug]` request: find the post (by slug through
 * the decoded/raw/NFC/NFD ladder, else by a redirectFrom match on the full
 * path), validate the prefix is a known surface (custom basePath, series
 * custom/auto path, or a legacy redirect declared on the post), then
 * classify canonical vs redirect.
 */
export function resolvePrefixedPost(rawPrefix: string, rawPostSlug: string): PrefixedPostResolution {
  const decodedPrefix = safeDecodeParam(rawPrefix);
  const currentPath = `/${decodedPrefix}/${safeDecodeParam(rawPostSlug)}`;

  const post =
    resolveFromParam(rawPostSlug, getPostBySlug) ??
    getAllPosts().find(candidate => candidate.redirectFrom?.includes(currentPath)) ??
    null;
  if (!post) return null;

  const basePath = getPostsBasePath();
  const customPaths = getSeriesCustomPaths();
  const isValidBasePath = decodedPrefix === basePath && basePath !== 'posts';
  const matchedSeriesSlug = Object.entries(customPaths).find(([, path]) => path === decodedPrefix)?.[0];
  const isAutoSeriesPath = getSeriesAutoPaths() && !Object.hasOwn(customPaths, decodedPrefix) && getSeriesData(decodedPrefix) !== null;
  const isLegacyRedirect = post.redirectFrom?.includes(currentPath) ?? false;

  if (!isValidBasePath && !matchedSeriesSlug && !isAutoSeriesPath && !isLegacyRedirect) {
    return null;
  }

  const canonicalUrl = getPostUrl(post);
  if (canonicalUrl !== currentPath) {
    return { kind: 'redirect', post, to: canonicalUrl };
  }
  return { kind: 'canonical', post };
}

export type SeriesParamResolution =
  | { kind: 'canonical'; slug: string }
  | { kind: 'alias'; slug: string; canonicalSlug: string; data: PostData };

/** Resolve a `series/[slug]` param: canonical series slug or redirectFrom alias. */
export function resolveSeriesParam(rawSlug: string): SeriesParamResolution {
  const slug = safeDecodeParam(rawSlug);
  const redirect = findSeriesByRedirectFrom(`${getSeriesListUrl()}/${slug}`);
  if (redirect) {
    return { kind: 'alias', slug, canonicalSlug: redirect.slug, data: redirect.data };
  }
  return { kind: 'canonical', slug };
}
