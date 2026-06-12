import GithubSlugger from 'github-slugger';
import type { PostData } from './types';
import { createMemo } from './cache';
import { getAllPosts } from './posts';

/**
 * Author aggregation and author-slug URLs. Author identity is the display
 * name in frontmatter; slugs are derived (never stored) so the two URL
 * forms — /authors/Name and /authors/name-slug — resolve to the same person.
 */

export function getAuthorSlug(author: string): string {
  const slugger = new GithubSlugger();
  // Normalize all Unicode dash punctuation to ASCII hyphen, then trim edges.
  // This avoids runtime-specific outputs like wrapped dash variants.
  return slugger
    .slug(author.trim())
    .replace(/[\p{Dash_Punctuation}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function getPostsByAuthor(author: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) =>
    post.authors.map(a => a.toLowerCase()).includes(author.toLowerCase())
  );
}

const allAuthorsMemo = createMemo<Record<string, number>>();

export function getAllAuthors(): Record<string, number> {
  return allAuthorsMemo.get(() => {
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
    return authors;
  });
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
