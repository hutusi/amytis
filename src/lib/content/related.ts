import { DEFAULT_CATEGORY, type PostData, type PostNavItem } from './types';
import { createKeyedMemo } from './cache';
import { getAllPosts } from './posts';
import { getSeriesData, getSeriesPosts, toPostNavItems } from './series';
import { getPostUrl } from '../urls';

/**
 * Related and adjacent post resolution. Both take the already-resolved post,
 * not a bare slug: duplicate slugs are legal across series, so re-looking-up
 * by slug (global first-match) would score/neighbour against the wrong
 * same-slug post. Adjacency is series-aware — inside a (non-collection) series
 * prev/next follow the series order; otherwise global date order.
 */

const relatedPostsMemo = createKeyedMemo<string, PostData[]>();

export function getRelatedPosts(currentPost: PostData, limit: number = 3): PostData[] {
  const currentUrl = getPostUrl(currentPost);
  // Within-locale: the candidate pool is the post's own tree, so a
  // translation can never surface its own twin as "related".
  return relatedPostsMemo.get(`${currentUrl}:${limit}`, () => {
    return getAllPosts(currentPost.locale)
      // Exclude by canonical identity, not slug — a different series' same-slug
      // post is a distinct post and stays eligible.
      .filter(post => getPostUrl(post) !== currentUrl)
      .map(post => {
        let score = 0;
        const commonTags = post.tags.filter(tag => currentPost.tags.includes(tag));
        score += commonTags.length * 2;

        if (post.category === currentPost.category && post.category !== DEFAULT_CATEGORY) {
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

const adjacentPostsMemo = createKeyedMemo<string, { prev: PostNavItem | null; next: PostNavItem | null }>();

const toNav = (post: PostData | null): PostNavItem | null =>
  post ? toPostNavItems([post])[0] : null;

export function getAdjacentPosts(currentPost: PostData): { prev: PostNavItem | null; next: PostNavItem | null } {
  const locale = currentPost.locale;
  if (currentPost.series) {
    const seriesData = getSeriesData(currentPost.series, locale);
    if (seriesData?.type !== 'collection') {
      const seriesPosts = getSeriesPosts(currentPost.series, locale);
      const seriesIndex = seriesPosts.findIndex(post => post.slug === currentPost.slug);
      if (seriesIndex !== -1) {
        return adjacentPostsMemo.get(`${locale} ${currentPost.series}/${currentPost.slug}`, () => ({
          prev: toNav(seriesIndex > 0 ? seriesPosts[seriesIndex - 1] : null),
          next: toNav(seriesIndex < seriesPosts.length - 1 ? seriesPosts[seriesIndex + 1] : null),
        }));
      }
    }
  }

  // Global date order within the post's own tree. Locate the current post by
  // canonical identity so a duplicate slug can't match a different post first.
  const currentUrl = getPostUrl(currentPost);
  return adjacentPostsMemo.get(currentUrl, () => {
    const allPosts = getAllPosts(locale); // sorted desc by date (newest first)
    const index = allPosts.findIndex(p => getPostUrl(p) === currentUrl);
    if (index === -1) {
      return { prev: null, next: null };
    }
    return {
      prev: toNav(index < allPosts.length - 1 ? allPosts[index + 1] : null), // older post
      next: toNav(index > 0 ? allPosts[index - 1] : null),                   // newer post
    };
  });
}
