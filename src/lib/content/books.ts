import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { siteConfig } from '../../../site.config';
import { byDateDesc } from '../sort';
import { extractContentMetrics } from '../text-metrics';
import type { Heading } from './types';
import { booksDirectory, readUtf8File } from './io';
import { createProdMemo, createProdKeyedMemo } from './cache';
import { normalizeCoverImage } from './cover-image';
import { dateField, draftField, invalidFrontmatterError } from './schema';

/**
 * Books: long-form content with an explicit TOC in the book index's
 * frontmatter. Chapters are resolved strictly at build time — a TOC entry
 * with no matching file on disk throws (strict-build invariant).
 */

export interface BookChapterEntry {
  title: string;
  id: string;
  /** Legacy single-level grouping; set when the chapter sits under a `{ part, chapters }` item. */
  part?: string;
  /** Deepest section title above this chapter (last element of sectionPath). */
  section?: string;
  /** Full ancestry of section titles from outermost to innermost. */
  sectionPath?: string[];
}

export interface BookChapterRef {
  title: string;
  id: string;
}

export interface BookTocPart {
  part: string;
  chapters: BookChapterRef[];
}

/** Nested grouping. `items` may recurse into further sections or hold leaf chapter refs. */
export interface BookTocSection {
  section: string;
  collapsible?: boolean;
  items: Array<BookTocSection | BookChapterRef>;
}

export type BookTocItem = BookTocPart | BookTocSection | BookChapterRef;

export interface BookData {
  title: string;
  slug: string;
  excerpt?: string;
  date: string;
  coverImage?: string;
  featured: boolean;
  draft: boolean;
  authors: string[];
  /** Book-level LaTeX flag — when true, all chapters render math even if their
   *  own frontmatter omits `latex: true`. Cheaper for math-heavy books than
   *  annotating every chapter file. */
  latex: boolean;
  /** Whether the chapter-page header renders the chapter's `excerpt`. Defaults
   *  to false: the typical case is that a chapter opens with its own lede
   *  paragraph, and an excerpt line above it just duplicates that text in the
   *  header. Set to true on books where the excerpt is a distinct subtitle
   *  the author actually wants the reader to see at the top of every chapter. */
  showChapterExcerpt: boolean;
  content: string;
  toc: BookTocItem[];
  chapters: BookChapterEntry[];
}

export interface BookChapterData {
  title: string;
  slug: string;
  bookSlug: string;
  content: string;
  headings: Heading[];
  excerpt?: string;
  latex: boolean;
  commentable?: boolean;
  readingMinutes: number;
  wordCount: number;
  isFolder: boolean;
  /** Absolute path of the markdown source file. Used to resolve relative `.md` links. */
  sourcePath: string;
  prevChapter: { title: string; id: string } | null;
  nextChapter: { title: string; id: string } | null;
}

const BookChapterRefSchema = z.object({
  title: z.string(),
  id: z.string(),
});

// Recursive: a section can nest further sections or leaf chapter refs.
const BookTocSectionSchema: z.ZodType<BookTocSection> = z.lazy(() =>
  z.object({
    section: z.string(),
    collapsible: z.boolean().optional(),
    items: z.array(z.union([BookTocSectionSchema, BookChapterRefSchema])),
  })
);

const BookTocItemSchema: z.ZodType<BookTocItem> = z.union([
  z.object({
    part: z.string(),
    chapters: z.array(BookChapterRefSchema),
  }),
  BookTocSectionSchema,
  BookChapterRefSchema,
]);

export const BookSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  date: dateField,
  coverImage: z.string().optional(),
  featured: z.boolean().optional().default(false),
  draft: draftField,
  authors: z.array(z.string()).optional().default([]),
  latex: z.boolean().optional().default(false),
  showChapterExcerpt: z.boolean().optional().default(false),
  chapters: z.array(BookTocItemSchema),
});

const BookChapterSchema = z.object({
  title: z.string().optional(),
  excerpt: z.string().optional(),
  draft: z.boolean().optional().default(false),
  latex: z.boolean().optional().default(false),
  commentable: z.boolean().optional(),
});

export function flattenBookChapters(toc: BookTocItem[]): BookChapterEntry[] {
  const result: BookChapterEntry[] = [];

  const walkSection = (
    items: Array<BookTocSection | BookChapterRef>,
    sectionPath: string[],
  ): void => {
    for (const item of items) {
      if ('section' in item) {
        walkSection(item.items, [...sectionPath, item.section]);
      } else {
        result.push({
          title: item.title,
          id: item.id,
          section: sectionPath[sectionPath.length - 1],
          sectionPath: sectionPath.length > 0 ? [...sectionPath] : undefined,
        });
      }
    }
  };

  for (const item of toc) {
    if ('part' in item) {
      for (const ch of item.chapters) {
        result.push({ title: ch.title, id: ch.id, part: item.part });
      }
    } else if ('section' in item) {
      walkSection([item], []);
    } else {
      result.push({ title: item.title, id: item.id });
    }
  }
  return result;
}

/**
 * Resolves a chapter id (possibly nested with `/`) to a markdown file on disk.
 * Returns `{ path, isFolder }` if a file exists in one of the six supported
 * forms (`<id>.mdx`, `<id>.md`, `<id>/index.mdx`, `<id>/index.md`,
 * `<id>/README.mdx`, `<id>/README.md`), or `null` if the id has no match.
 * Guards against `..`-style path escapes — any id that resolves outside
 * `bookDir` returns null.
 */
function resolveChapterFilePath(
  bookDir: string,
  chapterId: string,
): { path: string; isFolder: boolean } | null {
  const bookDirResolved = path.resolve(bookDir);
  const candidate = path.resolve(bookDir, chapterId);
  if (
    candidate !== bookDirResolved &&
    !candidate.startsWith(bookDirResolved + path.sep)
  ) {
    return null;
  }
  const chMdx = `${candidate}.mdx`;
  const chMd = `${candidate}.md`;
  const chFolderMdx = path.join(candidate, 'index.mdx');
  const chFolderMd = path.join(candidate, 'index.md');
  const chFolderReadmeMdx = path.join(candidate, 'README.mdx');
  const chFolderReadmeMd = path.join(candidate, 'README.md');
  if (fs.existsSync(chMdx)) return { path: chMdx, isFolder: false };
  if (fs.existsSync(chMd)) return { path: chMd, isFolder: false };
  if (fs.existsSync(chFolderMdx)) return { path: chFolderMdx, isFolder: true };
  if (fs.existsSync(chFolderMd)) return { path: chFolderMd, isFolder: true };
  if (fs.existsSync(chFolderReadmeMdx)) return { path: chFolderReadmeMdx, isFolder: true };
  if (fs.existsSync(chFolderReadmeMd)) return { path: chFolderReadmeMd, isFolder: true };
  return null;
}

const bookDataMemo = createProdKeyedMemo<string, BookData | null>();

/**
 * Book data by slug, memoized in production. Static generation asks for the
 * same book once per chapter (params, metadata, page body) and again from the
 * search-index route; without the memo each call re-read and re-parsed the
 * index plus every chapter's frontmatter (isChapterDraft), an O(N^2) reparse
 * per book. Dev recomputes so HMR sees edited content.
 */
export function getBookData(slug: string): BookData | null {
  return bookDataMemo.get(slug, () => computeBookData(slug));
}

function computeBookData(slug: string): BookData | null {
  if (!fs.existsSync(booksDirectory)) return null;
  const bookDir = path.join(booksDirectory, slug);
  if (!fs.existsSync(bookDir)) return null;

  const indexPathMdx = path.join(bookDir, 'index.mdx');
  const indexPathMd = path.join(bookDir, 'index.md');
  let fullPath = '';
  if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
  else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
  else return null;

  const fileContents = readUtf8File(fullPath);
  const { data: rawData, content } = matter(fileContents);

  const parsed = BookSchema.safeParse(rawData);
  if (!parsed.success) {
    // Invalid frontmatter is a build-time error, not a silent skip — consistent
    // with the missing-chapter throw below (strict-build invariant).
    throw invalidFrontmatterError('book frontmatter', fullPath, parsed.error);
  }
  const data = parsed.data;

  // Resolve chapter file paths and surface missing files as build-time errors
  // (strict-build invariant: misconfiguration must fail loudly, not silently).
  const chapters = flattenBookChapters(data.chapters);
  const missing: string[] = [];
  for (const ch of chapters) {
    if (!resolveChapterFilePath(bookDir, ch.id)) {
      missing.push(ch.id);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[amytis] Book "${slug}" references chapter${missing.length === 1 ? '' : 's'} ` +
      `with no matching file on disk: ${missing.map(id => `"${id}"`).join(', ')}. ` +
      `Expected one of <bookDir>/<id>.{md,mdx}, <bookDir>/<id>/index.{md,mdx}, or <bookDir>/<id>/README.{md,mdx}.`
    );
  }

  const coverImage = normalizeCoverImage(data.coverImage, `/books/${slug}`);

  let authors = data.authors;
  if (authors.length === 0) {
    // Same fallback chain as posts (parse.ts): the site-wide default authors,
    // not a hardcoded brand string.
    authors = siteConfig.posts?.authors?.default ?? [];
  }

  // In production, drop draft chapters from both the flattened list and the
  // nested TOC. getBookChapter returns null for them (→ 404), so leaving
  // them in produced dead prev/next and sidebar links from their published
  // neighbors. Dev keeps drafts visible, same policy as posts/flows.
  let toc = data.chapters;
  let visibleChapters = chapters;
  if (process.env.NODE_ENV === 'production') {
    const draftIds = new Set(
      chapters.filter(ch => isChapterDraft(bookDir, ch.id)).map(ch => ch.id)
    );
    if (draftIds.size > 0) {
      visibleChapters = chapters.filter(ch => !draftIds.has(ch.id));
      toc = filterTocDrafts(data.chapters, draftIds);
    }
  }

  return {
    title: data.title,
    slug,
    excerpt: data.excerpt,
    date: data.date,
    coverImage,
    featured: data.featured,
    draft: data.draft,
    authors,
    latex: data.latex,
    showChapterExcerpt: data.showChapterExcerpt,
    content: content.trim(),
    toc,
    chapters: visibleChapters,
  };
}

/**
 * Light draft probe for TOC filtering: reads only the frontmatter's `draft`
 * flag. Full schema validation still happens in getBookChapter, so a chapter
 * with otherwise-broken frontmatter is NOT treated as draft here — it stays
 * listed and fails the build loudly when rendered (strict-build invariant).
 */
function isChapterDraft(bookDir: string, chapterId: string): boolean {
  const resolved = resolveChapterFilePath(bookDir, chapterId);
  if (!resolved) return false; // Existence is validated separately above.
  const { data } = matter(readUtf8File(resolved.path));
  return data.draft === true;
}

/** Remove draft chapter refs from the nested TOC; prune emptied parts/sections. */
function filterTocDrafts(toc: BookTocItem[], draftIds: Set<string>): BookTocItem[] {
  const filterSectionItems = (
    items: Array<BookTocSection | BookChapterRef>,
  ): Array<BookTocSection | BookChapterRef> =>
    items.flatMap((item): Array<BookTocSection | BookChapterRef> => {
      if ('section' in item) {
        const kept = filterSectionItems(item.items);
        return kept.length > 0 ? [{ ...item, items: kept }] : [];
      }
      return draftIds.has(item.id) ? [] : [item];
    });

  return toc.flatMap((item): BookTocItem[] => {
    if ('part' in item) {
      const kept = item.chapters.filter(ch => !draftIds.has(ch.id));
      return kept.length > 0 ? [{ ...item, chapters: kept }] : [];
    }
    if ('section' in item) {
      return filterSectionItems([item]);
    }
    return draftIds.has(item.id) ? [] : [item];
  });
}

const bookChapterMemo = createProdKeyedMemo<string, BookChapterData | null>();

/**
 * Chapter data by book + chapter, memoized in production. Static generation
 * asks for the same chapter three times (generateStaticParams, generateMetadata,
 * page body); without the memo each re-read + re-parsed the chapter file and
 * recomputed its metrics. Dev recomputes so HMR sees edited content.
 */
export function getBookChapter(bookSlug: string, chapterSlug: string): BookChapterData | null {
  return bookChapterMemo.get(`${bookSlug}::${chapterSlug}`, () => computeBookChapter(bookSlug, chapterSlug));
}

function computeBookChapter(bookSlug: string, chapterSlug: string): BookChapterData | null {
  const book = getBookData(bookSlug);
  if (!book) return null;

  const bookDir = path.join(booksDirectory, bookSlug);
  const resolved = resolveChapterFilePath(bookDir, chapterSlug);
  if (!resolved) return null;
  const { path: fullPath, isFolder } = resolved;

  const fileContents = readUtf8File(fullPath);
  const { data: rawData, content } = matter(fileContents);

  const parsed = BookChapterSchema.safeParse(rawData);
  if (!parsed.success) {
    // A chapter listed in the TOC with broken frontmatter must fail the build,
    // not silently 404 (strict-build invariant; matches getBookData above).
    throw invalidFrontmatterError('chapter frontmatter', fullPath, parsed.error);
  }
  const data = parsed.data;

  if (process.env.NODE_ENV === 'production' && data.draft) {
    return null;
  }

  const { contentWithoutH1, excerpt: derivedExcerpt, headings, readingMinutes, wordCount } =
    extractContentMetrics(content);
  const excerpt = data.excerpt || derivedExcerpt;

  // Find prev/next
  const chapterIndex = book.chapters.findIndex(ch => ch.id === chapterSlug);
  const prevChapter = chapterIndex > 0 ? book.chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < book.chapters.length - 1 ? book.chapters[chapterIndex + 1] : null;

  // Title resolution: frontmatter wins, then book TOC entry, then first H1
  // in the body. VuePress chapters often omit frontmatter entirely and rely
  // on the H1 as the title, so this fallback chain keeps the import flow lossless.
  const fallbackFromToc = chapterIndex >= 0 ? book.chapters[chapterIndex].title : undefined;
  const h1Match = content.match(/^\s*#\s+([^\n]+)/);
  const fallbackFromH1 = h1Match?.[1].trim();
  const title = data.title || fallbackFromToc || fallbackFromH1 || chapterSlug;

  return {
    title,
    slug: chapterSlug,
    bookSlug,
    content: contentWithoutH1,
    headings,
    excerpt,
    // Chapter-level `latex: true` takes precedence; otherwise inherit the
    // book-level flag so math-heavy books don't need per-chapter annotation.
    latex: data.latex || book.latex,
    commentable: data.commentable,
    readingMinutes,
    wordCount,
    isFolder,
    sourcePath: fullPath,
    prevChapter: prevChapter ? { title: prevChapter.title, id: prevChapter.id } : null,
    nextChapter: nextChapter ? { title: nextChapter.title, id: nextChapter.id } : null,
  };
}

/** Absolute path of a book's content directory. Useful for plugins that
 *  need to resolve relative paths from chapter source files. */
export function getBookDirPath(bookSlug: string): string {
  return path.join(booksDirectory, bookSlug);
}

const allBooksMemo = createProdMemo<BookData[]>();

export function getAllBooks(): BookData[] {
  // Prod-only memo: getAllBooks runs from the root layout (books nav), so on a
  // static export it would otherwise re-read + re-parse every book index on
  // every page. Dev re-reads each call so HMR sees fresh books.
  return allBooksMemo.get(() => {
    if (!fs.existsSync(booksDirectory)) return [];

    const entries = fs.readdirSync(booksDirectory, { withFileTypes: true });
    const books: BookData[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const book = getBookData(entry.name);
      if (!book) continue;
      if (process.env.NODE_ENV === 'production' && book.draft) continue;
      books.push(book);
    }

    return books.sort(byDateDesc);
  });
}

export function getFeaturedBooks(): BookData[] {
  return getAllBooks().filter(book => book.featured);
}

export function getBooksByAuthor(author: string): BookData[] {
  return getAllBooks().filter(book =>
    book.authors.some(a => a.toLowerCase() === author.toLowerCase())
  );
}
