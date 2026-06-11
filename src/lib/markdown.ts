import fs from 'fs';
import { getPostUrl } from './urls';
import type { PostData } from './content/types';
import { seriesDirectory } from './content/io';
import { getCacheEnvKey } from './content/cache';
import { getAllFlows } from './content/flows';
import { getAllNotes } from './content/notes';
import { getAllPosts, getPostBySlug } from './content/posts';
import { getSeriesData, getSeriesPosts } from './content/series';

const tagsCache = new Map<string, Record<string, number>>();
const adjacentPostsCache = new Map<string, Map<string, { prev: PostData | null; next: PostData | null }>>();
const relatedPostsCache = new Map<string, Map<string, PostData[]>>();

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
