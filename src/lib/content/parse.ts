import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import { siteConfig } from '../../../site.config';
import { extractContentMetrics } from '../text-metrics';
import { parseRstDocument, RstParseError } from '../rst';
import { renderRstFile, renderRstFilesBatch, type RenderedRstDocument } from '../rst-renderer';
import type { PostData, CollectionItem, Heading } from './types';
import { contentDirectory, readUtf8File } from './io';
import { getSeriesAuthors, getSeriesTitle } from './series-metadata';
import { dateField, draftField, tagsField } from './schema';

/**
 * Frontmatter validation and file→PostData parsing for Markdown and rST
 * posts. Owns the Python-rST-renderer availability singleton: the test
 * hooks below mutate it, so they must live in the same module that the
 * production paths read it from.
 */

const ExternalLinkSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

const CollectionItemSchema = z.union([
  z.object({
    series: z.string(),
    exclude: z.array(z.string()).optional(),
    label: z.string().optional(),
  }).strict(),
  z.object({
    post: z.string(),
    label: z.string().optional(),
  }).strict(),
]);

export const PostSchema = z.object({
  title: z.string(),
  date: dateField.optional(),
  subtitle: z.string().optional(),
  excerpt: z.string().optional(),
  category: z.string().optional().default('Uncategorized'),
  tags: tagsField,
  authors: z.array(z.string()).optional(),
  author: z.string().optional(),
  layout: z.string().optional().default('post'),
  series: z.string().optional(),
  coverImage: z.string().optional(),
  sort: z.enum(['date-desc', 'date-asc', 'manual']).optional().default('date-desc'),
  posts: z.array(z.string()).optional(),
  type: z.literal('collection').optional(),
  items: z.array(CollectionItemSchema).optional(),
  featured: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
  draft: draftField,
  latex: z.boolean().optional().default(false),
  toc: z.boolean().optional().default(true),
  commentable: z.boolean().optional(),
  externalLinks: z.array(ExternalLinkSchema).optional().default([]),
  redirectFrom: z.array(z.string()).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.type === 'collection' && (!data.items || data.items.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['items'],
      message: 'Collections require at least one item.',
    });
  }
  if (data.type !== 'collection' && data.items) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['items'],
      message: '`items` is only valid when `type` is "collection".',
    });
  }
});

let pythonRstRendererAvailable: boolean | null = null;

const PYTHON_RUNTIME_UNAVAILABLE_PATTERN = /docutils|No module named|python(?:3)? .*not found|interpreter not found|ENOENT.*python/i;

function isPythonRuntimeUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.includes('__RST_FALLBACK__')) return true;
  if (error.message.includes('rST file not found')) return false;
  return PYTHON_RUNTIME_UNAVAILABLE_PATTERN.test(error.message);
}

function getRstImageBaseSlug(fullPath: string, slug: string): string {
  const isRootFlatPost = path.basename(fullPath) !== 'index.rst' &&
    path.dirname(fullPath) === contentDirectory;
  return isRootFlatPost ? 'posts' : `posts/${slug}`;
}

function isSeriesIndexRst(fullPath: string, slug: string, seriesName?: string): boolean {
  return Boolean(
    seriesName &&
    slug === seriesName &&
    (path.basename(fullPath) === 'index.rst' || path.basename(fullPath) === 'README.rst')
  );
}

function slugFromRstToctreeTarget(target: string): string | null {
  const trimmed = target.trim();
  if (!trimmed || trimmed.startsWith(':')) return null;
  if (/^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('/')) return null;

  const withoutAnchor = trimmed.split('#')[0]?.split('?')[0]?.trim();
  if (!withoutAnchor) return null;

  const normalized = withoutAnchor.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (!normalized || normalized.startsWith('../')) return null;

  const withoutExt = normalized.replace(/\.rst$/i, '');
  const parts = withoutExt.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const last = parts[parts.length - 1];
  if (last === 'index' || last === 'README') {
    return parts.length > 1 ? parts[parts.length - 2] : null;
  }

  return last;
}

function extractRstToctreePosts(source: string): string[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const posts: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\.\.\s+toctree::\s*$/.test(lines[i])) continue;

    i++;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      if (!/^\s+/.test(line)) {
        i--;
        break;
      }

      const trimmed = line.trim();
      if (!trimmed.startsWith(':')) {
        const slug = slugFromRstToctreeTarget(trimmed);
        if (slug && !seen.has(slug)) {
          seen.add(slug);
          posts.push(slug);
        }
      }
      i++;
    }
  }

  return posts;
}

function shouldUsePythonRstRenderer(): boolean {
  if (process.env.AMYTIS_ENABLE_PYTHON_RST === '1') return true;
  if (process.env.AMYTIS_ENABLE_PYTHON_RST === '0') return false;
  return process.env.NODE_ENV !== 'test';
}

export function parseMarkdownFile(fullPath: string, slug: string, dateFromFileName?: string, seriesName?: string): PostData {
  const fileContents = readUtf8File(fullPath);
  const { data: rawData, content } = matter(fileContents);
  // Flat files directly in content/posts/ share the posts root public directory for images.
  // Folder-based posts and series posts each have their own public subdirectory.
  const isRootFlatPost = path.basename(fullPath) !== 'index.mdx' &&
    path.basename(fullPath) !== 'index.md' &&
    path.dirname(fullPath) === contentDirectory;
  const imageBaseSlug = isRootFlatPost ? 'posts' : `posts/${slug}`;

  const parsed = PostSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid frontmatter in ${fullPath}:`, parsed.error.format());
    throw new Error(`Invalid frontmatter in ${fullPath}`);
  }
  const data = parsed.data;

  const { contentWithoutH1, excerpt: derivedExcerpt, headings, readingMinutes, wordCount } =
    extractContentMetrics(content);

  const effectiveSeriesSlug = data.series || seriesName;
  let authors: string[] = [];
  if (data.authors && Array.isArray(data.authors)) {
    authors = data.authors;
  } else if (data.author) {
    authors = [data.author];
  } else {
    // Inherit from series if this post belongs to one
    if (effectiveSeriesSlug) {
      const seriesAuthors = getSeriesAuthors(effectiveSeriesSlug);
      if (seriesAuthors) {
        authors = seriesAuthors;
      }
    }
    if (authors.length === 0) {
      const defaultAuthors = siteConfig.posts?.authors?.default;
      if (defaultAuthors && defaultAuthors.length > 0) {
        authors = defaultAuthors;
      }
    }
  }

  const excerpt = data.excerpt || derivedExcerpt;

  let date = data.date;
  if (!date && dateFromFileName) date = dateFromFileName;
  if (!date) date = fs.statSync(fullPath).mtime.toISOString().split('T')[0];

  let coverImage = data.coverImage;
  if (coverImage && !coverImage.startsWith('http') && !coverImage.startsWith('/') && !coverImage.startsWith('text:')) {
    const cleanPath = coverImage.replace(/^\.\//, '');
    coverImage = `/${imageBaseSlug}/${cleanPath}`;
  }

  return {
    slug,
    title: data.title,
    subtitle: data.subtitle,
    date,
    excerpt,
    category: data.category,
    tags: data.tags,
    authors,
    layout: data.layout,
    series: effectiveSeriesSlug,
    seriesTitle: effectiveSeriesSlug ? getSeriesTitle(effectiveSeriesSlug) : undefined,
    coverImage,
    sort: data.sort,
    posts: data.posts,
    featured: data.featured,
    pinned: data.pinned,
    draft: data.draft,
    latex: data.latex,
    toc: data.toc,
    commentable: data.commentable,
    type: data.type,
    items: data.items as CollectionItem[] | undefined,
    externalLinks: data.externalLinks,
    redirectFrom: data.redirectFrom,
    readingMinutes,
    wordCount,
    content: contentWithoutH1,
    headings,
    imageBaseSlug,
    sourceFormat: 'markdown',
  };
}

export function parseMarkdownFileForTests(
  fullPath: string,
  slug: string,
  dateFromFileName?: string,
  seriesName?: string,
): PostData {
  return parseMarkdownFile(fullPath, slug, dateFromFileName, seriesName);
}

export function parseRstFile(
  fullPath: string,
  slug: string,
  dateFromFileName?: string,
  seriesName?: string,
  preRendered?: RenderedRstDocument,
): PostData {
  try {
    const imageBaseSlug = getRstImageBaseSlug(fullPath, slug);
    const fileContents = readUtf8File(fullPath);

    let parsedTitle: string;
    let parsedBody: string;
    let parsedText: string | undefined;
    let parsedHeadings: Heading[];
    let parsedExcerpt: string;
    let parsedReadingMinutes: number;
    let parsedWordCount: number;
    let parsedHtml: string | undefined;
    let data: ReturnType<typeof parseRstDocument>['metadata'];
    try {
      if (preRendered) {
        const rendered = preRendered;
        parsedTitle = rendered.title;
        parsedBody = rendered.text;
        parsedText = rendered.text;
        parsedHeadings = rendered.headings;
        parsedExcerpt = rendered.excerpt;
        parsedReadingMinutes = rendered.readingMinutes;
        parsedWordCount = rendered.wordCount;
        parsedHtml = rendered.html;
        data = rendered.metadata;
      } else if (shouldUsePythonRstRenderer() && pythonRstRendererAvailable !== false) {
        const rendered = renderRstFile(fullPath, imageBaseSlug);
        pythonRstRendererAvailable = true;
        parsedTitle = rendered.title;
        parsedBody = rendered.text;
        parsedText = rendered.text;
        parsedHeadings = rendered.headings;
        parsedExcerpt = rendered.excerpt;
        parsedReadingMinutes = rendered.readingMinutes;
        parsedWordCount = rendered.wordCount;
        parsedHtml = rendered.html;
        data = rendered.metadata;
      } else {
        throw new Error('__RST_FALLBACK__');
      }
    } catch (error) {
      if (!isPythonRuntimeUnavailable(error)) {
        throw error;
      }
      if (pythonRstRendererAvailable !== false) {
        pythonRstRendererAvailable = false;
      }
      const parsed = parseRstDocument(fileContents);
      parsedTitle = parsed.title;
      parsedBody = parsed.body;
      parsedHeadings = parsed.headings;
      parsedExcerpt = parsed.excerpt;
      parsedReadingMinutes = parsed.readingMinutes;
      parsedWordCount = parsed.wordCount;
      data = parsed.metadata;
    }

    const effectiveSeriesSlug = data.series || seriesName;
    let authors: string[] = [];
    if (data.authors && data.authors.length > 0) {
      authors = data.authors;
    } else if (data.author) {
      authors = [data.author];
    } else {
      if (effectiveSeriesSlug) {
        const seriesAuthors = getSeriesAuthors(effectiveSeriesSlug);
        if (seriesAuthors) authors = seriesAuthors;
      }
      if (authors.length === 0) {
        const defaultAuthors = siteConfig.posts?.authors?.default;
        if (defaultAuthors && defaultAuthors.length > 0) {
          authors = defaultAuthors;
        }
      }
    }

    let date = data.date;
    if (!date && dateFromFileName) date = dateFromFileName;
    if (!date) date = fs.statSync(fullPath).mtime.toISOString().split('T')[0];

    let coverImage = data.coverImage;
    if (coverImage && !coverImage.startsWith('http') && !coverImage.startsWith('/') && !coverImage.startsWith('text:')) {
      const cleanPath = coverImage.replace(/^\.\//, '');
      coverImage = `/${imageBaseSlug}/${cleanPath}`;
    }
    const toctreePosts = isSeriesIndexRst(fullPath, slug, seriesName)
      ? extractRstToctreePosts(fileContents)
      : [];
    const seriesPosts = data.posts && data.posts.length > 0
      ? data.posts
      : ((data.sort === undefined || data.sort === 'manual') && toctreePosts.length > 0 ? toctreePosts : undefined);
    const sort = data.sort ?? (seriesPosts ? 'manual' : 'date-desc');

    return {
      slug,
      title: parsedTitle,
      subtitle: data.subtitle,
      date,
      excerpt: data.excerpt || parsedExcerpt,
      category: data.category ?? 'Uncategorized',
      tags: data.tags ?? [],
      authors,
      layout: data.layout ?? 'post',
      series: effectiveSeriesSlug,
      seriesTitle: effectiveSeriesSlug ? getSeriesTitle(effectiveSeriesSlug) : undefined,
      coverImage,
      sort,
      posts: seriesPosts,
      type: data.type,
      featured: data.featured ?? false,
      pinned: data.pinned ?? false,
      draft: data.draft ?? false,
      latex: data.latex ?? false,
      toc: data.toc ?? true,
      commentable: data.commentable,
      redirectFrom: data.redirectFrom ?? [],
      readingMinutes: parsedReadingMinutes,
      wordCount: parsedWordCount,
      content: parsedBody,
      renderedHtml: parsedHtml,
      plainText: parsedText,
      headings: parsedHeadings,
      imageBaseSlug,
      sourceFormat: 'rst',
    };
  } catch (error) {
    if (error instanceof RstParseError) {
      throw new RstParseError(`${error.message} (${fullPath})`);
    }
    throw error;
  }
}

export function parseRstFileForTests(
  fullPath: string,
  slug: string,
  dateFromFileName?: string,
  seriesName?: string,
  preRendered?: RenderedRstDocument,
): PostData {
  return parseRstFile(fullPath, slug, dateFromFileName, seriesName, preRendered);
}

export interface RstPostEntry {
  fullPath: string;
  slug: string;
  dateFromFileName?: string;
  seriesSlug?: string;
}

/**
 * Parse a batch of rST posts, batching the Python renderer invocation
 * (one process for N files instead of N processes). Falls back to the JS
 * parser per-file when the Python runtime is unavailable.
 */
export function parseRstPostEntries(entries: RstPostEntry[]): PostData[] {
  if (entries.length === 0) return [];

  let batchRenderedByFile: Map<string, RenderedRstDocument> | null = null;

  if (shouldUsePythonRstRenderer() && pythonRstRendererAvailable !== false) {
    try {
      batchRenderedByFile = renderRstFilesBatch(
        entries.map(entry => ({
          file: entry.fullPath,
          imageBaseSlug: getRstImageBaseSlug(entry.fullPath, entry.slug),
        }))
      );
      pythonRstRendererAvailable = true;
    } catch (error) {
      if (isPythonRuntimeUnavailable(error)) {
        pythonRstRendererAvailable = false;
      } else {
        throw error;
      }
    }
  }

  return entries.map(entry =>
    parseRstFile(
      entry.fullPath,
      entry.slug,
      entry.dateFromFileName,
      entry.seriesSlug,
      batchRenderedByFile?.get(entry.fullPath),
    )
  );
}

export function resetPythonRstRendererAvailabilityForTests(value: boolean | null = null): void {
  pythonRstRendererAvailable = value;
}

export function getPythonRstRendererAvailabilityForTests(): boolean | null {
  return pythonRstRendererAvailable;
}
