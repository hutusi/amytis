import fs from 'fs';
import path from 'path';
import { siteConfig } from '../../../site.config';

/**
 * Content-tree filesystem access and filename conventions.
 *
 * `readUtf8File` is the ONLY place in `src/lib/content/` allowed to call
 * `fs.readFileSync` — the path expression must carry the
 * `turbopackIgnore` annotation or Turbopack mis-bundles the read
 * (see CLAUDE.md). A guard test enforces the funnel.
 */

export const contentDirectory = path.join(process.cwd(), 'content', 'posts');
export const pagesDirectory = path.join(process.cwd(), 'content');
export const seriesDirectory = path.join(process.cwd(), 'content', 'series');
export const booksDirectory = path.join(process.cwd(), 'content', 'books');
export const flowsDirectory = path.join(process.cwd(), 'content', 'flows');
export const notesDirectory = path.join(process.cwd(), 'content', 'notes');

export function readUtf8File(filePath: string): string {
  return fs.readFileSync(/* turbopackIgnore: true */ filePath, 'utf8');
}

export function isMarkdownFilename(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx');
}

export function isRstFilename(name: string): boolean {
  return name.endsWith('.rst');
}

/** Split a `YYYY-MM-DD-slug` file name into slug + date (honoring `posts.includeDateInUrl`). */
export function parseSlugAndDate(rawName: string): { slug: string; dateFromFileName?: string } {
  const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
  const match = rawName.match(dateRegex);

  if (match) {
    return {
      dateFromFileName: match[1],
      slug: siteConfig.posts?.includeDateInUrl ? rawName : match[2],
    };
  }

  return { slug: rawName };
}

/** Reject series slugs that could escape the series directory (absolute, `..`, multi-segment). */
export function assertSafeSeriesSlug(seriesSlug: string): void {
  if (!seriesSlug || path.isAbsolute(seriesSlug)) {
    throw new Error(`[amytis] Invalid series slug "${seriesSlug}".`);
  }

  const segments = seriesSlug.split(/[\\/]/);
  if (segments.length !== 1 || segments[0] === '.' || segments[0] === '..') {
    throw new Error(`[amytis] Invalid series slug "${seriesSlug}".`);
  }
}
