import fs from 'fs';
import { byDateAsc, byDateDesc } from '../sort';
import type { PostData, CollectionContext } from './types';
import { seriesDirectory } from './io';
import { createMemo, createKeyedMemo } from './cache';
import { resolveSeriesIndexInfo, getSeriesAuthors } from './series-metadata';
import { parseMarkdownFile, parseRstFile } from './parse';
import { getAllPosts, getAllPostsIncludingUnpublished, getPostBySlug } from './posts';

/**
 * Series and collection queries. Collections live here, not in their own
 * module, because they ARE series folders (`type: collection` in the
 * series index): getAllSeries expands collections via getCollectionPosts,
 * and getCollectionPosts resolves its items via getSeriesPosts/getSeriesData —
 * splitting the two would create an import cycle.
 */

const seriesDataMemo = createKeyedMemo<string, PostData | null>();

export function getSeriesData(slug: string): PostData | null {
  return seriesDataMemo.get(slug, () => {
    const indexInfo = resolveSeriesIndexInfo(slug);
    if (!indexInfo) return null;

    return indexInfo.format === 'rst'
      ? parseRstFile(indexInfo.fullPath, slug, undefined, slug)
      : parseMarkdownFile(indexInfo.fullPath, slug, undefined, slug);
  });
}

const seriesPostsMemo = createKeyedMemo<string, PostData[]>();

export function getSeriesPosts(seriesName: string): PostData[] {
  return seriesPostsMemo.get(seriesName, () => {
    const seriesData = getSeriesData(seriesName);

    if (seriesData?.posts && seriesData.posts.length > 0) {
      // Manual Selection: fetch by slug. A slug that matches nothing in the
      // content tree is a build error (strict-build invariant — books throw
      // on missing chapters the same way); a post that exists but is
      // unpublished here (draft in production, future-dated) is skipped
      // silently like everywhere else.
      //
      // Prefer a post that already belongs to this series before the global
      // bare-slug lookup: duplicate slugs are legal across series, so a global
      // first-match would pull in another series' same-slug child. The global
      // fallback is what lets collections (type: collection) reference posts
      // that live outside the folder.
      return seriesData.posts.flatMap(slug => {
        const post =
          getAllPosts().find(p => p.series === seriesName && p.slug === slug) ??
          getPostBySlug(slug);
        if (post) return [post];
        if (getAllPostsIncludingUnpublished().some(p => p.slug === slug)) return [];
        throw new Error(
          `[amytis] Series "${seriesName}" lists post "${slug}" in its manual order, ` +
          `but no post with that slug exists. Fix or remove the slug in the series index frontmatter.`
        );
      });
    }

    // Automatic: posts with series field matching this series
    const posts = getAllPosts().filter(p => p.series === seriesName);

    // Default Sort: date-desc (Newest first)
    const sortOrder = seriesData?.sort || 'date-desc';
    if (sortOrder === 'date-asc') {
      posts.sort(byDateAsc);
    } else {
      posts.sort(byDateDesc);
    }
    return posts;
  });
}

const allSeriesMemo = createMemo<Record<string, PostData[]>>();

export function getAllSeries(): Record<string, PostData[]> {
  return allSeriesMemo.get(() => {
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

    return series;
  });
}

const featuredSeriesMemo = createMemo<Record<string, PostData[]>>();

export function getFeaturedSeries(): Record<string, PostData[]> {
  return featuredSeriesMemo.get(() => {
    const allSeries = getAllSeries();
    const featuredSeries: Record<string, PostData[]> = {};

    Object.keys(allSeries).forEach(slug => {
      const seriesData = getSeriesData(slug);
      if (seriesData?.featured) {
        featuredSeries[slug] = allSeries[slug];
      }
    });

    return featuredSeries;
  });
}

const seriesLatestDateMemo = createKeyedMemo<string, string>();

export function getSeriesLatestPostDate(slug: string): string {
  return seriesLatestDateMemo.get(slug, () => {
    const seriesData = getSeriesData(slug);
    const posts = seriesData?.type === 'collection' ? getCollectionPosts(slug) : getSeriesPosts(slug);
    const latestPostDate = posts.reduce((latest, post) => (post.date > latest ? post.date : latest), '');
    return latestPostDate || seriesData?.date || '';
  });
}

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

const collectionPostsMemo = createKeyedMemo<string, PostData[]>();

export function getCollectionPosts(collectionSlug: string): PostData[] {
  return collectionPostsMemo.get(collectionSlug, () => {
    const data = getSeriesData(collectionSlug);
    if (data?.type !== 'collection' || !data.items) {
      return [];
    }

    const getCollectionKey = (post: PostData) =>
      post.series ? `${post.series}/${post.slug}` : `posts/${post.slug}`;

    const allPosts = getAllPosts();
    const postIndex = new Map(allPosts.map((post) => [getCollectionKey(post), post]));
    const seen = new Set<string>();

    return data.items
      .flatMap(item => {
        if ('series' in item) {
          const posts = getSeriesPosts(item.series);
          return item.exclude ? posts.filter(p => !item.exclude!.includes(p.slug)) : posts;
        }

        const post = item.post.includes('/')
          ? postIndex.get(item.post)
          : getPostBySlug(item.post);
        if (post) return [post];

        // Same contract as manual series order above: unknown reference →
        // build error; existing-but-unpublished → silent skip.
        const existsUnpublished = getAllPostsIncludingUnpublished().some(p =>
          item.post.includes('/') ? getCollectionKey(p) === item.post : p.slug === item.post
        );
        if (existsUnpublished) return [];
        throw new Error(
          `[amytis] Collection "${collectionSlug}" lists item "${item.post}", ` +
          `but no post matches it. Fix or remove the item in the collection index frontmatter.`
        );
      })
      .filter(post => {
        const key = getCollectionKey(post);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  });
}

const collectionsForPostMemo = createKeyedMemo<string, CollectionContext[]>();

export function getCollectionsForPost(postSlug: string): CollectionContext[] {
  return collectionsForPostMemo.get(postSlug, () => {
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

    return results;
  });
}
