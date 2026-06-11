import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';
import GithubSlugger from 'github-slugger';
import { getPostUrl } from './urls';
import { byDateAsc, byDateDesc } from './sort';
import { getHeadings } from './text-metrics';
import type { PostData, CollectionContext, Heading } from './content/types';
import {
  contentDirectory,
  pagesDirectory,
  seriesDirectory,
  readUtf8File,
  parseSlugAndDate,
} from './content/io';
import { getCacheEnvKey } from './content/cache';
import {
  resolveSeriesIndexInfo,
  getSeriesContentEntries,
  getSeriesAuthors,
} from './content/series-metadata';
import { getAllFlows } from './content/flows';
import { getAllNotes } from './content/notes';
import {
  parseMarkdownFile,
  parseRstFile,
  parseRstPostEntries,
  type RstPostEntry,
} from './content/parse';

const postsCache = new Map<string, PostData[]>();
const pagesCache = new Map<string, PostData[]>();
const tagsCache = new Map<string, Record<string, number>>();
const authorsCache = new Map<string, Record<string, number>>();
const featuredPostsCache = new Map<string, PostData[]>();
const adjacentPostsCache = new Map<string, Map<string, { prev: PostData | null; next: PostData | null }>>();
const relatedPostsCache = new Map<string, Map<string, PostData[]>>();
const seriesDataCache = new Map<string, Map<string, PostData | null>>();
const seriesPostsCache = new Map<string, Map<string, PostData[]>>();
const allSeriesCache = new Map<string, Record<string, PostData[]>>();
const featuredSeriesCache = new Map<string, Record<string, PostData[]>>();
const seriesLatestDateCache = new Map<string, Map<string, string>>();
const collectionPostsCache = new Map<string, Map<string, PostData[]>>();
const collectionsForPostCache = new Map<string, Map<string, CollectionContext[]>>();

/**
 * Resolve display authors for a series: explicit series authors first,
 * then top contributors aggregated from the series' posts.
 */
export function resolveSeriesAuthors(slug: string, posts: PostData[]): string[] {
  const explicit = getSeriesAuthors(slug);
  if (explicit) return explicit;
  if (posts.length === 0) return [];
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const author of post.authors) {
      counts.set(author, (counts.get(author) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export function getAllPosts(): PostData[] {
  const cacheKey = getCacheEnvKey();
  const cached = postsCache.get(cacheKey);
  if (cached) return cached;

  const allPostsData: PostData[] = [];
  const pendingRstPosts: RstPostEntry[] = [];

  // Helper to process a directory
  const processDirectory = (dir: string, isSeriesDir: boolean = false) => {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach((item) => {
      let fullPath = '';
      let slug = '';
      let dateFromFileName = undefined;

      const rawName = item.name.replace(/\.mdx?$/, '');
      ({ slug, dateFromFileName } = parseSlugAndDate(rawName));

      // Handle Series Directory logic
      if (isSeriesDir) {
        if (item.isDirectory()) {
          const seriesSlug = item.name;
          const indexInfo = resolveSeriesIndexInfo(seriesSlug);
          if (!indexInfo) return;

          getSeriesContentEntries(seriesSlug).forEach(entry => {
            if (indexInfo.format === 'rst') {
              pendingRstPosts.push({
                fullPath: entry.fullPath,
                slug: entry.slug,
                dateFromFileName: entry.dateFromFileName,
                seriesSlug,
              });
            } else {
              allPostsData.push(parseMarkdownFile(entry.fullPath, entry.slug, entry.dateFromFileName, seriesSlug));
            }
          });
          return;
        }
      }

      // Standard Posts logic (outside series)
      if (item.isFile()) {
        if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return;
        fullPath = path.join(dir, item.name);
        allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName));
      } else if (item.isDirectory()) {
        const indexPathMdx = path.join(dir, item.name, 'index.mdx');
        const indexPathMd = path.join(dir, item.name, 'index.md');
        if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
        else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
        else return;
        
        allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName));
      }
    });
  };

  processDirectory(contentDirectory);
  processDirectory(seriesDirectory, true);

  allPostsData.push(...parseRstPostEntries(pendingRstPosts));

  const result = allPostsData
    .filter(post => {
      if (post.category === 'Page') return false;
      
      if (process.env.NODE_ENV === 'production' && post.draft) {
        return false;
      }

      if (!siteConfig.posts?.showFuturePosts) {
        const postDate = new Date(post.date);
        const now = new Date();
        if (postDate > now) return false;
      }
      return true;
    })
    .sort(byDateDesc);
  postsCache.set(cacheKey, result);
  return result;
}

/**
 * Returns posts for the main listing pages, honouring posts.excludeFromListing.
 * Use this instead of getAllPosts() on any listing/pagination page.
 * Individual post routes and series pages still use getAllPosts() directly.
 */
export function getListingPosts(): PostData[] {
  const excluded = new Set(siteConfig.posts?.excludeFromListing ?? []);
  if (excluded.size === 0) return getAllPosts();
  return getAllPosts().filter(p => !p.series || !excluded.has(p.series));
}

export function getPostBySlug(slug: string): PostData | null {
  return getAllPosts().find(post => post.slug === slug) ?? null;
}

/**
 * Load the content and frontmatter of a locale variant file, e.g. about.zh.mdx.
 * Returns null when the file does not exist or cannot be parsed.
 */
function loadLocaleContent(slug: string, locale: string): { content: string; title?: string; excerpt?: string; headings?: Heading[] } | null {
  for (const ext of ['.mdx', '.md']) {
    const filePath = path.join(pagesDirectory, `${slug}.${locale}${ext}`);
    if (fs.existsSync(filePath)) {
      try {
        const { data, content } = matter(readUtf8File(filePath));
        const body = content.replace(/^\s*#\s+[^\n]+/, '').trim();
        return {
          content: body,
          title: typeof data.title === 'string' ? data.title : undefined,
          excerpt: typeof data.excerpt === 'string' ? data.excerpt : undefined,
          headings: getHeadings(body),
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Collect contentLocales for all non-default locales that have a variant file.
 */
function attachContentLocales(page: PostData, slug: string): PostData {
  const defaultLocale = siteConfig.i18n.defaultLocale;
  const otherLocales = siteConfig.i18n.locales.filter(l => l !== defaultLocale);
  const contentLocales: NonNullable<PostData['contentLocales']> = {};
  for (const locale of otherLocales) {
    const localeData = loadLocaleContent(slug, locale);
    if (localeData !== null) contentLocales[locale] = localeData;
  }
  return Object.keys(contentLocales).length > 0 ? { ...page, contentLocales } : page;
}

export function getPageBySlug(slug: string): PostData | null {
  try {
    let fullPath = path.join(pagesDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(pagesDirectory, `${slug}.md`);
    }
    if (!fs.existsSync(fullPath)) return null;
    return attachContentLocales(parseMarkdownFile(fullPath, slug), slug);
  } catch {
    return null;
  }
}

export function getAllPages(): PostData[] {
  const cacheKey = getCacheEnvKey();
  const cached = pagesCache.get(cacheKey);
  if (cached) return cached;

  const items = fs.readdirSync(pagesDirectory, { withFileTypes: true });
  const result = items
    .filter(item => {
      if (!item.isFile()) return false;
      if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return false;
      // Exclude locale variant files (e.g. about.zh.mdx, about.en.mdx) — they are not standalone routes
      const base = item.name.replace(/\.mdx?$/, '');
      const parts = base.split('.');
      if (parts.length > 1 && siteConfig.i18n.locales.includes(parts[parts.length - 1])) {
        return false;
      }
      return true;
    })
    .map(item => {
      const slug = item.name.replace(/\.mdx?$/, '');
      const fullPath = path.join(pagesDirectory, item.name);
      return attachContentLocales(parseMarkdownFile(fullPath, slug), slug);
    });
  pagesCache.set(cacheKey, result);
  return result;
}

export function getPostsByTag(tag: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getAllTags(): Record<string, number> {
  const cacheKey = getCacheEnvKey();
  const cached = tagsCache.get(cacheKey);
  if (cached) return cached;

  const allPosts = getAllPosts();
  const allFlows = getAllFlows();
  const allNotes = getAllNotes();

  // counts keyed by lowercase for deduplication; display preserves first-seen casing
  const counts: Record<string, number> = {};
  const display: Record<string, string> = {};

  const addTags = (tags: string[]) => {
    // seen is per-document: prevents a single post with both "React" and
    // "react" in its tags from being counted twice.
    const seen = new Set<string>();
    for (const tag of tags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // First-seen casing wins globally. If post A uses "React" and post B
      // uses "react", the display form will be whichever was processed first
      // (typically alphabetical by filename). Authors should use consistent
      // casing in frontmatter to avoid ambiguity.
      if (!display[key]) display[key] = tag;
      counts[key] = (counts[key] || 0) + 1;
    }
  };

  allPosts.forEach((post) => { addTags(post.tags); });
  allFlows.forEach((flow) => { addTags(flow.tags); });
  allNotes.forEach((note) => { addTags(note.tags); });

  // Return with original-casing display form as key so consumers can show it correctly.
  // Callers that use the key as a URL slug must call key.toLowerCase().
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(counts)) {
    result[display[key]] = count;
  }
  tagsCache.set(cacheKey, result);
  return result;
}

export function getPostsByAuthor(author: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.authors.map(a => a.toLowerCase()).includes(author.toLowerCase())
  );
}

export function getAuthorSlug(author: string): string {
  const slugger = new GithubSlugger();
  // Normalize all Unicode dash punctuation to ASCII hyphen, then trim edges.
  // This avoids runtime-specific outputs like wrapped dash variants.
  return slugger
    .slug(author.trim())
    .replace(/[\p{Dash_Punctuation}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function getAllAuthors(): Record<string, number> {
  const cacheKey = getCacheEnvKey();
  const cached = authorsCache.get(cacheKey);
  if (cached) return cached;

  const allPosts = getAllPosts();
  const authors: Record<string, number> = {};

  allPosts.forEach((post) => {
    post.authors.forEach((author) => {
      if (authors[author]) {
        authors[author] += 1;
      } else {
        authors[author] = 1;
      }
    });
  });
  authorsCache.set(cacheKey, authors);
  return authors;
}

export function resolveAuthorParam(authorParam: string): string | null {
  const allAuthors = Object.keys(getAllAuthors());
  const normalizedParam = authorParam.trim().toLowerCase();

  // Backward compatibility for name-based URLs (/authors/Amytis%20Team).
  const exactMatch = allAuthors.find((author) => author.toLowerCase() === normalizedParam);
  if (exactMatch) return exactMatch;

  // Preferred slug-based URLs (/authors/amytis-team).
  const slugMatch = allAuthors.find((author) => getAuthorSlug(author) === normalizedParam);
  return slugMatch || null;
}

export function getRelatedPosts(currentSlug: string, limit: number = 3): PostData[] {
  const cacheKey = getCacheEnvKey();
  let bySlug = relatedPostsCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    relatedPostsCache.set(cacheKey, bySlug);
  }
  const cacheId = `${currentSlug}:${limit}`;
  const cached = bySlug.get(cacheId);
  if (cached) return cached;

  const allPosts = getAllPosts();
  const currentPost = allPosts.find(p => p.slug === currentSlug);

  if (!currentPost) return [];

  const related = allPosts
    .filter(post => post.slug !== currentSlug)
    .map(post => {
      let score = 0;
      const commonTags = post.tags.filter(tag => currentPost.tags.includes(tag));
      score += commonTags.length * 2;

      if (post.category === currentPost.category && post.category !== 'Uncategorized') {
        score += 1;
      }

      return { post, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.post);

  bySlug.set(cacheId, related);
  return related;
}

export function getSeriesPosts(seriesName: string): PostData[] {
  const cacheKey = getCacheEnvKey();
  let bySeries = seriesPostsCache.get(cacheKey);
  if (!bySeries) {
    bySeries = new Map();
    seriesPostsCache.set(cacheKey, bySeries);
  }
  const cached = bySeries.get(seriesName);
  if (cached) return cached;

  const seriesSlug = seriesName;
  const seriesData = getSeriesData(seriesSlug);
  
  let posts: PostData[] = [];
  
  if (seriesData?.posts && seriesData.posts.length > 0) {
      // Manual Selection: fetch by slug
      posts = seriesData.posts
        .map(slug => getPostBySlug(slug))
        .filter((p): p is PostData => p !== null);
  } else {
      // Automatic: posts with series field matching this series
      const allPosts = getAllPosts();
      posts = allPosts.filter(p => p.series === seriesName);
      
      // Default Sort: date-desc (Newest first)
      const sortOrder = seriesData?.sort || 'date-desc';
      if (sortOrder === 'date-asc') {
          posts.sort(byDateAsc);
      } else {
          posts.sort(byDateDesc);
      }
  }
  
  bySeries.set(seriesName, posts);
  return posts;
}

export function getAllSeries(): Record<string, PostData[]> {
  const cacheKey = getCacheEnvKey();
  const cached = allSeriesCache.get(cacheKey);
  if (cached) return cached;

  const allPosts = getAllPosts();
  const series: Record<string, PostData[]> = {};
  const seriesSet = new Set<string>();

  // 1. Collect series from posts
  allPosts.forEach((post) => {
    if (post.series) {
      seriesSet.add(post.series);
    }
  });

  // 2. Collect series from folders (in case no posts are yet tagged but folder exists)
  if (fs.existsSync(seriesDirectory)) {
    const seriesFolders = fs.readdirSync(seriesDirectory, { withFileTypes: true });
    seriesFolders.forEach(folder => {
      if (folder.isDirectory()) {
        seriesSet.add(folder.name);
      }
    });
  }

  // 3. Fetch posts for each series, filtering out draft series in production
  seriesSet.forEach(slug => {
    const seriesData = getSeriesData(slug);
    if (process.env.NODE_ENV === 'production' && seriesData?.draft) {
      return; // Skip draft series in production
    }
    series[slug] = seriesData?.type === 'collection'
      ? getCollectionPosts(slug).slice().sort(byDateDesc)
      : getSeriesPosts(slug);
  });

  allSeriesCache.set(cacheKey, series);
  return series;
}

export function getSeriesLatestPostDate(slug: string): string {
  const cacheKey = getCacheEnvKey();
  let bySlug = seriesLatestDateCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    seriesLatestDateCache.set(cacheKey, bySlug);
  }
  const cached = bySlug.get(slug);
  if (cached !== undefined) return cached;

  const seriesData = getSeriesData(slug);
  const posts = seriesData?.type === 'collection' ? getCollectionPosts(slug) : getSeriesPosts(slug);
  const latestPostDate = posts.reduce((latest, post) => (post.date > latest ? post.date : latest), '');
  const resolved = latestPostDate || seriesData?.date || '';

  bySlug.set(slug, resolved);
  return resolved;
}

export function getFeaturedPosts(): PostData[] {
  const cacheKey = getCacheEnvKey();
  const cached = featuredPostsCache.get(cacheKey);
  if (cached) return cached;
  const result = getAllPosts().filter(post => post.featured);
  featuredPostsCache.set(cacheKey, result);
  return result;
}

export function getAdjacentPosts(slug: string): { prev: PostData | null; next: PostData | null } {
  const cacheKey = getCacheEnvKey();
  let bySlug = adjacentPostsCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    adjacentPostsCache.set(cacheKey, bySlug);
  }
  const currentPost = getPostBySlug(slug);
  if (currentPost?.series) {
    const seriesCacheKey = `${currentPost.series}/${slug}`;
    const cachedSeries = bySlug.get(seriesCacheKey);
    if (cachedSeries) return cachedSeries;

    const seriesData = getSeriesData(currentPost.series);
    if (seriesData?.type !== 'collection') {
      const seriesPosts = getSeriesPosts(currentPost.series);
      const seriesIndex = seriesPosts.findIndex(post => post.slug === slug);
      if (seriesIndex !== -1) {
        const seriesResult = {
          prev: seriesIndex > 0 ? seriesPosts[seriesIndex - 1] : null,
          next: seriesIndex < seriesPosts.length - 1 ? seriesPosts[seriesIndex + 1] : null,
        };
        bySlug.set(seriesCacheKey, seriesResult);
        return seriesResult;
      }
    }
  }

  const cached = bySlug.get(slug);
  if (cached) return cached;

  const allPosts = getAllPosts(); // sorted desc by date (newest first)
  const index = allPosts.findIndex(p => p.slug === slug);
  if (index === -1) {
    const empty = { prev: null, next: null };
    bySlug.set(slug, empty);
    return empty;
  }
  const result = {
    prev: index < allPosts.length - 1 ? allPosts[index + 1] : null, // older post
    next: index > 0 ? allPosts[index - 1] : null,                   // newer post
  };
  bySlug.set(slug, result);
  return result;
}

export function getFeaturedSeries(): Record<string, PostData[]> {
  const cacheKey = getCacheEnvKey();
  const cached = featuredSeriesCache.get(cacheKey);
  if (cached) return cached;

  const allSeries = getAllSeries();
  const featuredSeries: Record<string, PostData[]> = {};
  
  Object.keys(allSeries).forEach(slug => {
    const seriesData = getSeriesData(slug);
    if (seriesData?.featured) {
      featuredSeries[slug] = allSeries[slug];
    }
  });
  
  featuredSeriesCache.set(cacheKey, featuredSeries);
  return featuredSeries;
}

export function getSeriesData(slug: string): PostData | null {
  const cacheKey = getCacheEnvKey();
  let bySlug = seriesDataCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    seriesDataCache.set(cacheKey, bySlug);
  }
  if (bySlug.has(slug)) return bySlug.get(slug) ?? null;

  const indexInfo = resolveSeriesIndexInfo(slug);
  if (!indexInfo) {
    bySlug.set(slug, null);
    return null;
  }

  const result = indexInfo.format === 'rst'
    ? parseRstFile(indexInfo.fullPath, slug, undefined, slug)
    : parseMarkdownFile(indexInfo.fullPath, slug, undefined, slug);
  bySlug.set(slug, result);
  return result;
}

export function getCollectionPosts(collectionSlug: string): PostData[] {
  const cacheKey = getCacheEnvKey();
  let bySlug = collectionPostsCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    collectionPostsCache.set(cacheKey, bySlug);
  }
  const cached = bySlug.get(collectionSlug);
  if (cached) return cached;

  const data = getSeriesData(collectionSlug);
  if (data?.type !== 'collection' || !data.items) {
    bySlug.set(collectionSlug, []);
    return [];
  }

  const getCollectionKey = (post: PostData) =>
    post.series ? `${post.series}/${post.slug}` : `posts/${post.slug}`;

  const allPosts = getAllPosts();
  const postIndex = new Map(allPosts.map((post) => [getCollectionKey(post), post]));
  const seen = new Set<string>();

  const result = data.items
    .flatMap(item => {
      if ('series' in item) {
        const posts = getSeriesPosts(item.series);
        return item.exclude ? posts.filter(p => !item.exclude!.includes(p.slug)) : posts;
      }

      const post = item.post.includes('/')
        ? postIndex.get(item.post)
        : getPostBySlug(item.post);

      return post ? [post] : [];
    })
    .filter(post => {
      const key = getCollectionKey(post);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  bySlug.set(collectionSlug, result);
  return result;
}

export function getCollectionsForPost(postSlug: string): CollectionContext[] {
  const cacheKey = getCacheEnvKey();
  let bySlug = collectionsForPostCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    collectionsForPostCache.set(cacheKey, bySlug);
  }
  const cached = bySlug.get(postSlug);
  if (cached) return cached;

  if (!fs.existsSync(seriesDirectory)) return [];
  const seriesFolders = fs.readdirSync(seriesDirectory, { withFileTypes: true });
  const results: CollectionContext[] = [];

  for (const folder of seriesFolders) {
    if (!folder.isDirectory()) continue;
    const data = getSeriesData(folder.name);
    if (data?.type !== 'collection') continue;
    if (process.env.NODE_ENV === 'production' && data.draft) continue;
    const posts = getCollectionPosts(folder.name);
    if (posts.some(p => p.slug === postSlug)) {
      results.push({ slug: folder.name, title: data.title, posts });
    }
  }

  bySlug.set(postSlug, results);
  return results;
}

// ─── Books ──────────────────────────────────────────────────────────────────

// ─── Slug Registry ───────────────────────────────────────────────────────────

export interface SlugRegistryEntry {
  url: string;
  type: 'post' | 'note' | 'flow' | 'series';
  title: string;
}

let _slugRegistry: Map<string, SlugRegistryEntry> | null = null;

export function buildSlugRegistry(): Map<string, SlugRegistryEntry> {
  if (_slugRegistry && process.env.NODE_ENV === 'production') return _slugRegistry;

  const map = new Map<string, SlugRegistryEntry>();

  getAllPosts().forEach(p =>
    map.set(p.slug, { url: getPostUrl(p), type: 'post', title: p.title })
  );

  getAllFlows().forEach(f =>
    map.set(f.slug, { url: `/flows/${f.slug}`, type: 'flow', title: f.title })
  );

  getAllNotes().forEach(n => {
    if (map.has(n.slug)) {
      console.warn(`[slugRegistry] Note slug "${n.slug}" conflicts with an existing entry.`);
    }
    map.set(n.slug, { url: `/notes/${n.slug}`, type: 'note', title: n.title });
    n.aliases.forEach(a => {
      if (map.has(a)) {
        console.warn(`[slugRegistry] Note alias "${a}" (→ ${n.slug}) conflicts with existing slug; skipping.`);
      } else {
        map.set(a, { url: `/notes/${n.slug}`, type: 'note', title: n.title });
      }
    });
  });

  if (fs.existsSync(seriesDirectory)) {
    fs.readdirSync(seriesDirectory, { withFileTypes: true }).forEach(entry => {
      if (!entry.isDirectory()) return;
      const slug = entry.name;
      const seriesData = getSeriesData(slug);
      map.set(slug, {
        url: `/series/${slug}`,
        type: 'series',
        title: seriesData?.title || slug,
      });
    });
  }

  _slugRegistry = map;
  return map;
}

// ─── Backlink Index ──────────────────────────────────────────────────────────

export interface BacklinkSource {
  slug: string;
  title: string;
  type: 'post' | 'note' | 'flow' | 'series';
  url: string;
  context: string;
}

function extractWikilinkContext(text: string, matchStart: number, matchEnd: number): string {
  const RADIUS = 120;
  const start = Math.max(0, matchStart - RADIUS);
  const end = Math.min(text.length, matchEnd + RADIUS);
  let ctx = text.slice(start, end);

  // Replace wikilinks in context with just display text for readability
  ctx = ctx.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, slug, display) => display || slug);

  if (start > 0) ctx = ctx.replace(/^[^\s.!?]{1,30}/, '').trimStart();
  if (end < text.length) ctx = ctx.replace(/[^\s.!?]{1,30}$/, '').trimEnd();

  return ctx.trim().slice(0, 200);
}

function buildBacklinkIndex(): Map<string, BacklinkSource[]> {
  const index = new Map<string, BacklinkSource[]>();

  const addBacklinks = (
    content: string,
    sourceSlug: string,
    sourceTitle: string,
    sourceType: BacklinkSource['type'],
    sourceUrl: string
  ) => {
    // Create a fresh RegExp per call to avoid lastIndex issues with 'g' flag
    const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
    let match;
    while ((match = WIKILINK.exec(content)) !== null) {
      const targetSlug = match[1].trim();
      if (targetSlug === sourceSlug) continue; // skip self-references
      const context = extractWikilinkContext(content, match.index, match.index + match[0].length);
      let sources = index.get(targetSlug);
      if (!sources) {
        sources = [];
        index.set(targetSlug, sources);
      }
      if (!sources.some(b => b.slug === sourceSlug && b.type === sourceType)) {
        sources.push({ slug: sourceSlug, title: sourceTitle, type: sourceType, url: sourceUrl, context });
      }
    }
  };

  getAllPosts().forEach(p => addBacklinks(p.content, p.slug, p.title, 'post', getPostUrl(p)));
  getAllNotes().forEach(n => addBacklinks(n.content, n.slug, n.title, 'note', `/notes/${n.slug}`));
  getAllFlows().forEach(f => addBacklinks(f.content, f.slug, f.title, 'flow', `/flows/${f.slug}`));

  return index;
}

let _backlinkIndex: Map<string, BacklinkSource[]> | null = null;

export function getBacklinks(slug: string): BacklinkSource[] {
  if (!_backlinkIndex || process.env.NODE_ENV !== 'production') _backlinkIndex = buildBacklinkIndex();
  return _backlinkIndex.get(slug) ?? [];
}
