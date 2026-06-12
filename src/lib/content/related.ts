import type { PostData } from './types';
import { createKeyedMemo } from './cache';
import { getAllPosts, getPostBySlug } from './posts';
import { getSeriesData, getSeriesPosts } from './series';

/**
 * Related and adjacent post resolution. Adjacency is series-aware: inside
 * a (non-collection) series, prev/next follow the series order; otherwise
 * they follow global date order.
 */

const relatedPostsMemo = createKeyedMemo<string, PostData[]>();

export function getRelatedPosts(currentSlug: string, limit: number = 3): PostData[] {
  return relatedPostsMemo.get(`${currentSlug}:${limit}`, () => {
    const allPosts = getAllPosts();
    const currentPost = allPosts.find(p => p.slug === currentSlug);

    if (!currentPost) return [];

    return allPosts
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
  });
}

const adjacentPostsMemo = createKeyedMemo<string, { prev: PostData | null; next: PostData | null }>();

export function getAdjacentPosts(slug: string): { prev: PostData | null; next: PostData | null } {
  const currentPost = getPostBySlug(slug);

  if (currentPost?.series) {
    const seriesData = getSeriesData(currentPost.series);
    if (seriesData?.type !== 'collection') {
      const seriesPosts = getSeriesPosts(currentPost.series);
      const seriesIndex = seriesPosts.findIndex(post => post.slug === slug);
      if (seriesIndex !== -1) {
        return adjacentPostsMemo.get(`${currentPost.series}/${slug}`, () => ({
          prev: seriesIndex > 0 ? seriesPosts[seriesIndex - 1] : null,
          next: seriesIndex < seriesPosts.length - 1 ? seriesPosts[seriesIndex + 1] : null,
        }));
      }
    }
  }

  return adjacentPostsMemo.get(slug, () => {
    const allPosts = getAllPosts(); // sorted desc by date (newest first)
    const index = allPosts.findIndex(p => p.slug === slug);
    if (index === -1) {
      return { prev: null, next: null };
    }
    return {
      prev: index < allPosts.length - 1 ? allPosts[index + 1] : null, // older post
      next: index > 0 ? allPosts[index - 1] : null,                   // newer post
    };
  });
}
