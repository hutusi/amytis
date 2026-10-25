import GithubSlugger from 'github-slugger';
import type { PostData } from './types';
import { createMemo } from './cache';
import { getPostsWithLocaleOriginals } from './posts';

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

/**
 * The /authors/[author] route params: every author's slug, plus the legacy
 * name-form URL (/authors/Amytis%20Team) that redirects to it — except a
 * name that differs from a route already taken only by case ("Amytis" next
 * to the slug "amytis"). On case-insensitive filesystems (macOS, Windows)
 * those two export to one directory and the last write wins, so the legacy
 * redirect could replace the real page with a stub that redirects to itself.
 */
export function getAuthorRouteParams(authorNames: string[]): string[] {
  const params = [...new Set(authorNames.map(getAuthorSlug))];
  const taken = new Set(params.map((param) => param.toLowerCase()));
  for (const name of authorNames) {
    const key = name.toLowerCase();
    if (taken.has(key)) continue;
    taken.add(key);
    params.push(name);
  }
  return params;
}

export function getPostsByAuthor(author: string): PostData[] {
  const allPosts = getPostsWithLocaleOriginals();
  return allPosts.filter((post) =>
    post.authors.map(a => a.toLowerCase()).includes(author.toLowerCase())
  );
}

const allAuthorsMemo = createMemo<Record<string, number>>();

export function getAllAuthors(): Record<string, number> {
  return allAuthorsMemo.get(() => {
    const allPosts = getPostsWithLocaleOriginals();
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
