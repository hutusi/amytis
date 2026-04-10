import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';
import GithubSlugger from 'github-slugger';
import { z } from 'zod';
import { getPostUrl } from './urls';
import { parseRstDocument, RstParseError } from './rst';
import { renderRstFile, renderRstFilesBatch, type RenderedRstDocument } from './rst-renderer';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');
const pagesDirectory = path.join(process.cwd(), 'content');
const seriesDirectory = path.join(process.cwd(), 'content', 'series');
const booksDirectory = path.join(process.cwd(), 'content', 'books');
const flowsDirectory = path.join(process.cwd(), 'content', 'flows');
const notesDirectory = path.join(process.cwd(), 'content', 'notes');

function readUtf8File(filePath: string): string {
  return fs.readFileSync(/* turbopackIgnore: true */ filePath, 'utf8');
}

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

export type CollectionItem =
  | { series: string; exclude?: string[]; label?: string }
  | { post: string; label?: string };

export interface CollectionContext {
  slug: string;
  title: string;
  posts: PostData[];
}

const PostSchema = z.object({
  title: z.string(),
  date: z.union([z.string(), z.date()]).transform(val => new Date(val).toISOString().split('T')[0]).optional(),
  subtitle: z.string().optional(),
  excerpt: z.string().optional(),
  category: z.string().optional().default('Uncategorized'),
  tags: z.array(z.string()).optional().default([]),
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
  draft: z.boolean().optional().default(false),
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

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface ExternalLink {
  name: string;
  url: string;
}

export interface PostData {
  slug: string;
  title: string;
  subtitle?: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  authors: string[];
  layout?: string;
  series?: string;
  seriesTitle?: string;
  coverImage?: string;
  sort?: 'date-desc' | 'date-asc' | 'manual';
  posts?: string[];
  type?: 'collection';
  items?: CollectionItem[];
  featured?: boolean;
  pinned?: boolean;
  draft?: boolean;
  latex?: boolean;
  toc?: boolean;
  commentable?: boolean;
  externalLinks?: ExternalLink[];
  redirectFrom?: string[];
  readingTime: string;
  content: string;
  renderedHtml?: string;
  plainText?: string;
  headings: Heading[];
  contentLocales?: Record<string, { content: string; title?: string; excerpt?: string; headings?: Heading[] }>;
  /** Public-relative base path used for resolving co-located images (e.g. "posts/my-post" or "posts" for root flat files). */
  imageBaseSlug: string;
  sourceFormat?: 'markdown' | 'rst';
}

type SeriesFormat = 'markdown' | 'rst';

interface SeriesIndexInfo {
  format: SeriesFormat;
  fullPath: string;
}

interface SeriesContentEntry {
  fullPath: string;
  slug: string;
  dateFromFileName?: string;
}

interface PendingRstPostEntry {
  fullPath: string;
  slug: string;
  dateFromFileName?: string;
  seriesSlug?: string;
}

function getCacheEnvKey(): string {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

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
const seriesAuthorsCache = new Map<string, Map<string, string[] | null>>();
const seriesTitleCache = new Map<string, Map<string, string | undefined>>();
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

export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const hanCharsPerMinute = 300;

  // Strip tags and common markdown syntax before counting.
  const text = content
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~>\-[\]()]/g, " ");

  const hanCharCount = (text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g) || []).length;
  const latinWordCount = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;

  const estimatedMinutes = (latinWordCount / wordsPerMinute) + (hanCharCount / hanCharsPerMinute);
  const minutes = Math.max(1, Math.ceil(estimatedMinutes));
  return `${minutes} min read`;
}

export function generateExcerpt(content: string): string {
  let plain = content.replace(/^#+\s+/gm, '');
  plain = plain.replace(/```[\s\S]*?```/g, '');
  plain = plain.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
  plain = plain.replace(/\*\[([^\]]+)\*\]\([^)]+\)/g, '$1');
  plain = plain.replace(/(\$\*\*|__|\*|_)/g, '');
  plain = plain.replace(/`([^`]+)`/g, '$1');
  plain = plain.replace(/^>\s+/gm, '');
  plain = plain.replace(/\s+/g, ' ').trim();
  
  if (plain.length <= 160) {
    return plain;
  }
  return plain.slice(0, 160).trim() + '...';
}

export function getHeadings(content: string): Heading[] {
  const regex = /^(#{2,3})\s+(.*)$/gm;
  const headings: Heading[] = [];
  const slugger = new GithubSlugger();
  let match;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = slugger.slug(text);
    
    headings.push({ id, text, level });
  }
  return headings;
}

/**
 * Read explicitly configured authors from a series index file's frontmatter.
 * Returns null if no authors are configured (as opposed to the default fallback).
 */
export function getSeriesAuthors(seriesSlug: string): string[] | null {
  const cacheKey = getCacheEnvKey();
  let bySlug = seriesAuthorsCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    seriesAuthorsCache.set(cacheKey, bySlug);
  }
  if (bySlug.has(seriesSlug)) return bySlug.get(seriesSlug) ?? null;

  const indexInfo = resolveSeriesIndexInfo(seriesSlug);
  if (!indexInfo) {
    bySlug.set(seriesSlug, null);
    return null;
  }

  if (indexInfo.format === 'rst') {
    const parsed = parseRstDocument(readUtf8File(indexInfo.fullPath));
    if (parsed.metadata.authors && parsed.metadata.authors.length > 0) {
      bySlug.set(seriesSlug, parsed.metadata.authors);
      return parsed.metadata.authors;
    }
    if (parsed.metadata.author && typeof parsed.metadata.author === 'string') {
      const authors = [parsed.metadata.author];
      bySlug.set(seriesSlug, authors);
      return authors;
    }
    bySlug.set(seriesSlug, null);
    return null;
  }

  const { data } = matter(readUtf8File(indexInfo.fullPath));
  if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
    const authors = data.authors as string[];
    bySlug.set(seriesSlug, authors);
    return authors;
  }
  if (data.author && typeof data.author === 'string') {
    const authors = [data.author as string];
    bySlug.set(seriesSlug, authors);
    return authors;
  }
  bySlug.set(seriesSlug, null);
  return null;
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

function parseSlugAndDate(rawName: string): { slug: string; dateFromFileName?: string } {
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

function isMarkdownFilename(name: string): boolean {
  return name.endsWith('.md') || name.endsWith('.mdx');
}

function isRstFilename(name: string): boolean {
  return name.endsWith('.rst');
}

function assertSafeSeriesSlug(seriesSlug: string): void {
  if (!seriesSlug || path.isAbsolute(seriesSlug)) {
    throw new Error(`[amytis] Invalid series slug "${seriesSlug}".`);
  }

  const segments = seriesSlug.split(/[\\/]/);
  if (segments.length !== 1 || segments[0] === '.' || segments[0] === '..') {
    throw new Error(`[amytis] Invalid series slug "${seriesSlug}".`);
  }
}

function resolveUniqueSeriesIndex(seriesSlug: string, format: SeriesFormat): string | null {
  assertSafeSeriesSlug(seriesSlug);
  const seriesPath = path.join(seriesDirectory, seriesSlug);
  const candidates = format === 'rst'
    ? ['index.rst', 'README.rst']
    : ['index.mdx', 'index.md', 'README.mdx', 'README.md'];

  const matches = candidates
    .map(name => path.join(seriesPath, name))
    .filter(fullPath => fs.existsSync(fullPath));

  if (matches.length > 1) {
    throw new Error(
      `[amytis] Series "${seriesSlug}" has multiple ${format} index files: ${matches.map(match => path.basename(match)).join(', ')}.`
    );
  }

  return matches[0] ?? null;
}

function resolveSeriesIndexInfo(slug: string): SeriesIndexInfo | null {
  assertSafeSeriesSlug(slug);
  if (!fs.existsSync(seriesDirectory)) return null;
  const seriesPath = path.join(seriesDirectory, slug);
  if (!fs.existsSync(seriesPath) || !fs.statSync(seriesPath).isDirectory()) return null;

  const rstIndex = resolveUniqueSeriesIndex(slug, 'rst');
  const markdownIndex = resolveUniqueSeriesIndex(slug, 'markdown');

  if (rstIndex && markdownIndex) {
    throw new Error(
      `[amytis] Series "${slug}" cannot contain both rST and Markdown index files (${path.basename(rstIndex)} and ${path.basename(markdownIndex)}).`
    );
  }
  if (rstIndex) return { format: 'rst', fullPath: rstIndex };
  if (markdownIndex) return { format: 'markdown', fullPath: markdownIndex };
  return null;
}

function getSeriesContentEntries(seriesSlug: string): SeriesContentEntry[] {
  const indexInfo = resolveSeriesIndexInfo(seriesSlug);
  if (!indexInfo) return [];

  const seriesPath = path.join(seriesDirectory, seriesSlug);
  const seriesItems = fs.readdirSync(seriesPath, { withFileTypes: true });
  const entries: SeriesContentEntry[] = [];
  const seenSlugs = new Map<string, string>();
  const seriesIndexBasenames = new Set(['index.rst', 'README.rst', 'index.md', 'index.mdx', 'README.md', 'README.mdx']);

  for (const item of seriesItems) {
    if (seriesIndexBasenames.has(item.name)) continue;

    if (item.isFile()) {
      const isMarkdown = isMarkdownFilename(item.name);
      const isRst = isRstFilename(item.name);
      if (!isMarkdown && !isRst) continue;

      const itemFormat: SeriesFormat = isRst ? 'rst' : 'markdown';
      if (itemFormat !== indexInfo.format) {
        throw new Error(`[amytis] Series "${seriesSlug}" mixes ${indexInfo.format} and ${itemFormat} files. Offending file: ${item.name}`);
      }

      const rawName = item.name.replace(/\.(mdx?|rst)$/, '');
      const { slug, dateFromFileName } = parseSlugAndDate(rawName);
      const prior = seenSlugs.get(slug);
      if (prior) {
        throw new Error(`[amytis] Series "${seriesSlug}" contains duplicate post slug "${slug}" from "${prior}" and "${item.name}".`);
      }
      seenSlugs.set(slug, item.name);
      entries.push({ fullPath: path.join(seriesPath, item.name), slug, dateFromFileName });
      continue;
    }

    if (item.isDirectory()) {
      const folderPath = path.join(seriesPath, item.name);
      const folderIndexRst = path.join(folderPath, 'index.rst');
      const folderIndexMdx = path.join(folderPath, 'index.mdx');
      const folderIndexMd = path.join(folderPath, 'index.md');
      const hasRst = fs.existsSync(folderIndexRst);
      const hasMdx = fs.existsSync(folderIndexMdx);
      const hasMd = fs.existsSync(folderIndexMd);
      const markdownCount = Number(hasMdx) + Number(hasMd);
      const totalIndexCount = Number(hasRst) + markdownCount;

      if (totalIndexCount === 0) continue;
      if (hasRst && markdownCount > 0) {
        throw new Error(`[amytis] Series "${seriesSlug}" post folder "${item.name}" cannot contain both index.rst and Markdown index files.`);
      }
      if (markdownCount > 1) {
        throw new Error(`[amytis] Series "${seriesSlug}" post folder "${item.name}" cannot contain both index.md and index.mdx.`);
      }

      const itemFormat: SeriesFormat = hasRst ? 'rst' : 'markdown';
      if (itemFormat !== indexInfo.format) {
        throw new Error(`[amytis] Series "${seriesSlug}" mixes ${indexInfo.format} and ${itemFormat} files. Offending folder: ${item.name}`);
      }

      const { slug, dateFromFileName } = parseSlugAndDate(item.name);
      const prior = seenSlugs.get(slug);
      if (prior) {
        throw new Error(`[amytis] Series "${seriesSlug}" contains duplicate post slug "${slug}" from "${prior}" and "${item.name}".`);
      }
      seenSlugs.set(slug, item.name);
      entries.push({
        fullPath: hasRst ? folderIndexRst : (hasMdx ? folderIndexMdx : folderIndexMd),
        slug,
        dateFromFileName,
      });
    }
  }

  return entries;
}

function getSeriesTitle(slug: string): string | undefined {
  const cacheKey = getCacheEnvKey();
  let bySlug = seriesTitleCache.get(cacheKey);
  if (!bySlug) {
    bySlug = new Map();
    seriesTitleCache.set(cacheKey, bySlug);
  }
  if (bySlug.has(slug)) return bySlug.get(slug);

  const indexInfo = resolveSeriesIndexInfo(slug);
  if (!indexInfo) {
    bySlug.set(slug, undefined);
    return undefined;
  }

  if (indexInfo.format === 'rst') {
    const parsed = parseRstDocument(readUtf8File(indexInfo.fullPath));
    if (parsed.metadata.draft === true) {
      bySlug.set(slug, undefined);
      return undefined;
    }
    bySlug.set(slug, parsed.title);
    return parsed.title;
  }

  const { data } = matter(readUtf8File(indexInfo.fullPath));
  if (data.draft === true) {
    bySlug.set(slug, undefined);
    return undefined;
  }
  const title = typeof data.title === 'string' ? data.title : undefined;
  bySlug.set(slug, title);
  return title;
}

function parseMarkdownFile(fullPath: string, slug: string, dateFromFileName?: string, seriesName?: string): PostData {
  const fileContents = fs.readFileSync(fullPath, 'utf8');
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

  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();

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

  const excerpt = data.excerpt || generateExcerpt(contentWithoutH1);
  const readingTime = calculateReadingTime(contentWithoutH1);
  
  let date = data.date;
  if (!date && dateFromFileName) date = dateFromFileName;
  if (!date) date = fs.statSync(fullPath).mtime.toISOString().split('T')[0];

  const headings = getHeadings(content);

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
    readingTime,
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

function parseRstFile(
  fullPath: string,
  slug: string,
  dateFromFileName?: string,
  seriesName?: string,
  preRendered?: RenderedRstDocument,
): PostData {
  try {
    const imageBaseSlug = getRstImageBaseSlug(fullPath, slug);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    let parsedTitle: string;
    let parsedBody: string;
    let parsedText: string | undefined;
    let parsedHeadings: Heading[];
    let parsedExcerpt: string;
    let parsedReadingTime: string;
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
        parsedReadingTime = rendered.readingTime;
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
        parsedReadingTime = rendered.readingTime;
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
      parsedReadingTime = parsed.readingTime;
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
      readingTime: parsedReadingTime,
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

export function resetPythonRstRendererAvailabilityForTests(value: boolean | null = null): void {
  pythonRstRendererAvailable = value;
}

export function getPythonRstRendererAvailabilityForTests(): boolean | null {
  return pythonRstRendererAvailable;
}

export function getAllPosts(): PostData[] {
  const cacheKey = getCacheEnvKey();
  const cached = postsCache.get(cacheKey);
  if (cached) return cached;

  const allPostsData: PostData[] = [];
  const pendingRstPosts: PendingRstPostEntry[] = [];

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

  if (pendingRstPosts.length > 0) {
    let batchRenderedByFile: Map<string, RenderedRstDocument> | null = null;

    if (shouldUsePythonRstRenderer() && pythonRstRendererAvailable !== false) {
      try {
        batchRenderedByFile = renderRstFilesBatch(
          pendingRstPosts.map(entry => ({
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

    pendingRstPosts.forEach(entry => {
      allPostsData.push(
        parseRstFile(
          entry.fullPath,
          entry.slug,
          entry.dateFromFileName,
          entry.seriesSlug,
          batchRenderedByFile?.get(entry.fullPath),
        )
      );
    });
  }

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
    .sort((a, b) => (a.date < b.date ? 1 : -1));
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
        const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
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

export function getFlowTags(): Record<string, number> {
  const allFlows = getAllFlows();
  const tags: Record<string, number> = {};
  allFlows.forEach((flow) => {
    flow.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      tags[normalizedTag] = (tags[normalizedTag] || 0) + 1;
    });
  });
  return tags;
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
          posts.sort((a, b) => (a.date > b.date ? 1 : -1));
      } else {
          posts.sort((a, b) => (a.date < b.date ? 1 : -1));
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
      ? getCollectionPosts(slug).slice().sort((a, b) => (a.date < b.date ? 1 : -1))
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

export interface BookChapterEntry {
  title: string;
  id: string;
  part?: string;
}

export interface BookTocPart {
  part: string;
  chapters: { title: string; id: string }[];
}
export type BookTocItem = BookTocPart | { title: string; id: string };

export interface BookData {
  title: string;
  slug: string;
  excerpt?: string;
  date: string;
  coverImage?: string;
  featured: boolean;
  draft: boolean;
  authors: string[];
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
  readingTime: string;
  isFolder: boolean;
  prevChapter: { title: string; id: string } | null;
  nextChapter: { title: string; id: string } | null;
}

const BookChapterRefSchema = z.object({
  title: z.string(),
  id: z.string(),
});

const BookTocItemSchema: z.ZodType<BookTocItem> = z.union([
  z.object({
    part: z.string(),
    chapters: z.array(BookChapterRefSchema),
  }),
  BookChapterRefSchema,
]);

const BookSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  date: z.union([z.string(), z.date()]).transform(val => new Date(val).toISOString().split('T')[0]),
  coverImage: z.string().optional(),
  featured: z.boolean().optional().default(false),
  draft: z.boolean().optional().default(false),
  authors: z.array(z.string()).optional().default([]),
  chapters: z.array(BookTocItemSchema),
});

const BookChapterSchema = z.object({
  title: z.string(),
  excerpt: z.string().optional(),
  draft: z.boolean().optional().default(false),
  latex: z.boolean().optional().default(false),
  commentable: z.boolean().optional(),
});

function flattenBookChapters(toc: BookTocItem[]): BookChapterEntry[] {
  const result: BookChapterEntry[] = [];
  for (const item of toc) {
    if ('part' in item) {
      for (const ch of item.chapters) {
        result.push({ title: ch.title, id: ch.id, part: item.part });
      }
    } else {
      result.push({ title: item.title, id: item.id });
    }
  }
  return result;
}

export function getBookData(slug: string): BookData | null {
  if (!fs.existsSync(booksDirectory)) return null;
  const bookDir = path.join(booksDirectory, slug);
  if (!fs.existsSync(bookDir)) return null;

  const indexPathMdx = path.join(bookDir, 'index.mdx');
  const indexPathMd = path.join(bookDir, 'index.md');
  let fullPath = '';
  if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
  else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
  else return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data: rawData, content } = matter(fileContents);

  const parsed = BookSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid book frontmatter in ${fullPath}:`, parsed.error.format());
    return null;
  }
  const data = parsed.data;

  // Warn about missing chapter files
  const chapters = flattenBookChapters(data.chapters);
  for (const ch of chapters) {
    const chMdx = path.join(bookDir, `${ch.id}.mdx`);
    const chMd = path.join(bookDir, `${ch.id}.md`);
    const chFolderMdx = path.join(bookDir, ch.id, 'index.mdx');
    const chFolderMd = path.join(bookDir, ch.id, 'index.md');
    if (!fs.existsSync(chMdx) && !fs.existsSync(chMd) && !fs.existsSync(chFolderMdx) && !fs.existsSync(chFolderMd)) {
      console.warn(`Book "${slug}": chapter "${ch.id}" not found`);
    }
  }

  let coverImage = data.coverImage;
  if (coverImage && !coverImage.startsWith('http') && !coverImage.startsWith('/') && !coverImage.startsWith('text:')) {
    const cleanPath = coverImage.replace(/^\.\//, '');
    coverImage = `/books/${slug}/${cleanPath}`;
  }

  let authors = data.authors;
  if (authors.length === 0) {
    authors = ['Amytis'];
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
    content: content.trim(),
    toc: data.chapters,
    chapters,
  };
}

export function getBookChapter(bookSlug: string, chapterSlug: string): BookChapterData | null {
  const book = getBookData(bookSlug);
  if (!book) return null;

  const bookDir = path.join(booksDirectory, bookSlug);
  const chMdx = path.join(bookDir, `${chapterSlug}.mdx`);
  const chMd = path.join(bookDir, `${chapterSlug}.md`);
  const chFolderMdx = path.join(bookDir, chapterSlug, 'index.mdx');
  const chFolderMd = path.join(bookDir, chapterSlug, 'index.md');
  let fullPath = '';
  let isFolder = false;
  if (fs.existsSync(chMdx)) fullPath = chMdx;
  else if (fs.existsSync(chMd)) fullPath = chMd;
  else if (fs.existsSync(chFolderMdx)) { fullPath = chFolderMdx; isFolder = true; }
  else if (fs.existsSync(chFolderMd)) { fullPath = chFolderMd; isFolder = true; }
  else return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data: rawData, content } = matter(fileContents);

  const parsed = BookChapterSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid chapter frontmatter in ${fullPath}:`, parsed.error.format());
    return null;
  }
  const data = parsed.data;

  if (process.env.NODE_ENV === 'production' && data.draft) {
    return null;
  }

  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();
  const headings = getHeadings(content);
  const readingTime = calculateReadingTime(contentWithoutH1);
  const excerpt = data.excerpt || generateExcerpt(contentWithoutH1);

  // Find prev/next
  const chapterIndex = book.chapters.findIndex(ch => ch.id === chapterSlug);
  const prevChapter = chapterIndex > 0 ? book.chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < book.chapters.length - 1 ? book.chapters[chapterIndex + 1] : null;

  return {
    title: data.title,
    slug: chapterSlug,
    bookSlug,
    content: contentWithoutH1,
    headings,
    excerpt,
    latex: data.latex,
    commentable: data.commentable,
    readingTime,
    isFolder,
    prevChapter: prevChapter ? { title: prevChapter.title, id: prevChapter.id } : null,
    nextChapter: nextChapter ? { title: nextChapter.title, id: nextChapter.id } : null,
  };
}

export function getAllBooks(): BookData[] {
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

  return books.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getFeaturedBooks(): BookData[] {
  return getAllBooks().filter(book => book.featured);
}

export function getBooksByAuthor(author: string): BookData[] {
  return getAllBooks().filter(book =>
    book.authors.some(a => a.toLowerCase() === author.toLowerCase())
  );
}

// ─── Flows (Daily Notes) ────────────────────────────────────────────────────

const FlowSchema = z.object({
  title: z.string().optional(),
  date: z.union([z.string(), z.date()]).transform(val => new Date(val).toISOString().split('T')[0]).optional(),
  tags: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
  commentable: z.boolean().optional(),
});

export interface FlowData {
  slug: string;
  date: string;
  title: string;
  tags: string[];
  draft: boolean;
  commentable?: boolean;
  content: string;
  excerpt: string;
  headings: Heading[];
}

function parseFlowFile(fullPath: string, slug: string): FlowData {
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data: rawData, content } = matter(fileContents);

  const parsed = FlowSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid flow frontmatter in ${fullPath}:`, parsed.error.format());
    throw new Error(`Invalid flow frontmatter in ${fullPath}`);
  }
  const data = parsed.data;

  const h1Match = content.match(/^\s*#\s+(.+)/);
  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();
  const date = data.date || slug.replace(/\//g, '-'); // slug is YYYY/MM/DD, convert to YYYY-MM-DD
  const excerpt = generateExcerpt(contentWithoutH1);
  const headings = getHeadings(content);

  return {
    slug,
    date,
    title: data.title?.trim() || h1Match?.[1]?.trim() || date, // frontmatter(non-empty) → H1 → date
    tags: data.tags,
    draft: data.draft,
    commentable: data.commentable,
    content: contentWithoutH1,
    excerpt,
    headings,
  };
}

export function getAllFlows(): FlowData[] {
  if (!fs.existsSync(flowsDirectory)) return [];

  const flows: FlowData[] = [];

  // Walk content/flows/YYYY/MM/ structure
  const yearDirs = fs.readdirSync(flowsDirectory, { withFileTypes: true });
  for (const yearEntry of yearDirs) {
    if (!yearEntry.isDirectory() || !/^\d{4}$/.test(yearEntry.name)) continue;
    const yearPath = path.join(flowsDirectory, yearEntry.name);

    const monthDirs = fs.readdirSync(yearPath, { withFileTypes: true });
    for (const monthEntry of monthDirs) {
      if (!monthEntry.isDirectory() || !/^\d{2}$/.test(monthEntry.name)) continue;
      const monthPath = path.join(yearPath, monthEntry.name);

      const dayItems = fs.readdirSync(monthPath, { withFileTypes: true });
      for (const dayItem of dayItems) {
        const rawName = dayItem.name.replace(/\.mdx?$/, '');
        if (!/^\d{2}$/.test(rawName)) continue;

        const year = yearEntry.name;
        const month = monthEntry.name;
        const day = rawName;
        const slug = `${year}/${month}/${day}`;
        let fullPath = '';

        if (dayItem.isFile() && (dayItem.name.endsWith('.md') || dayItem.name.endsWith('.mdx'))) {
          fullPath = path.join(monthPath, dayItem.name);
        } else if (dayItem.isDirectory()) {
          const indexMdx = path.join(monthPath, dayItem.name, 'index.mdx');
          const indexMd = path.join(monthPath, dayItem.name, 'index.md');
          if (fs.existsSync(indexMdx)) fullPath = indexMdx;
          else if (fs.existsSync(indexMd)) fullPath = indexMd;
          else continue;
        } else {
          continue;
        }

        flows.push(parseFlowFile(fullPath, slug));
      }
    }
  }

  return flows
    .filter(flow => {
      if (process.env.NODE_ENV === 'production' && flow.draft) return false;
      if (!siteConfig.posts?.showFuturePosts) {
        const flowDate = new Date(flow.date);
        const now = new Date();
        if (flowDate > now) return false;
      }
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getFlowBySlug(slug: string): FlowData | null {
  if (!fs.existsSync(flowsDirectory)) return null;

  // slug format: "YYYY/MM/DD"
  const parts = slug.split('/');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;

  const basePath = path.join(flowsDirectory, year, month);
  if (!fs.existsSync(basePath)) return null;

  // Try flat file
  const mdxPath = path.join(basePath, `${day}.mdx`);
  const mdPath = path.join(basePath, `${day}.md`);
  if (fs.existsSync(mdxPath)) return parseFlowFile(mdxPath, slug);
  if (fs.existsSync(mdPath)) return parseFlowFile(mdPath, slug);

  // Try folder
  const indexMdx = path.join(basePath, day, 'index.mdx');
  const indexMd = path.join(basePath, day, 'index.md');
  if (fs.existsSync(indexMdx)) return parseFlowFile(indexMdx, slug);
  if (fs.existsSync(indexMd)) return parseFlowFile(indexMd, slug);

  return null;
}

export function getFlowsByYear(year: string): FlowData[] {
  return getAllFlows().filter(f => f.slug.startsWith(`${year}/`));
}

export function getFlowsByMonth(year: string, month: string): FlowData[] {
  return getAllFlows().filter(f => f.slug.startsWith(`${year}/${month}/`));
}

export function getFlowsByTag(tag: string): FlowData[] {
  return getAllFlows().filter(f =>
    f.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getAdjacentFlows(slug: string): { prev: FlowData | null; next: FlowData | null } {
  const allFlows = getAllFlows(); // sorted newest-first
  const index = allFlows.findIndex(f => f.slug === slug);
  if (index === -1) return { prev: null, next: null };

  return {
    prev: index < allFlows.length - 1 ? allFlows[index + 1] : null, // older
    next: index > 0 ? allFlows[index - 1] : null, // newer
  };
}

export function getRecentFlows(limit: number = 5): FlowData[] {
  return getAllFlows().slice(0, limit);
}

// ─── Notes (Knowledge Base) ──────────────────────────────────────────────────

const NoteSchema = z.object({
  title: z.string(),
  date: z.union([z.string(), z.date()]).transform(val => new Date(val).toISOString().split('T')[0]).optional(),
  tags: z.array(z.string()).optional().default([]),
  draft: z.boolean().optional().default(false),
  aliases: z.array(z.string()).optional().default([]),
  toc: z.boolean().optional().default(true),
  backlinks: z.boolean().optional().default(true),
  commentable: z.boolean().optional(),
});

export interface NoteData {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  draft: boolean;
  aliases: string[];
  toc: boolean;
  backlinks: boolean;
  commentable?: boolean;
  content: string;
  excerpt: string;
  headings: Heading[];
  readingTime: string;
}

function parseNoteFile(fullPath: string, slug: string): NoteData {
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data: rawData, content } = matter(fileContents);

  const parsed = NoteSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid note frontmatter in ${fullPath}:`, parsed.error.format());
    throw new Error(`Invalid note frontmatter in ${fullPath}`);
  }
  const data = parsed.data;

  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();
  const date = data.date || fs.statSync(fullPath).mtime.toISOString().split('T')[0];
  const excerpt = generateExcerpt(contentWithoutH1);
  const headings = getHeadings(content);
  const readingTime = calculateReadingTime(contentWithoutH1);

  return {
    slug,
    title: data.title,
    date,
    tags: data.tags,
    draft: data.draft,
    aliases: data.aliases,
    toc: data.toc,
    backlinks: data.backlinks,
    commentable: data.commentable,
    content: contentWithoutH1,
    excerpt,
    headings,
    readingTime,
  };
}

let _allNotes: NoteData[] | null = null;

export function getAllNotes(): NoteData[] {
  if (_allNotes && process.env.NODE_ENV === 'production') return _allNotes;

  if (!fs.existsSync(notesDirectory)) {
    _allNotes = [];
    return _allNotes;
  }

  const notes: NoteData[] = [];
  const items = fs.readdirSync(notesDirectory, { withFileTypes: true });

  for (const item of items) {
    if (!item.isFile()) continue;
    if (!item.name.endsWith('.md') && !item.name.endsWith('.mdx')) continue;
    const slug = item.name.replace(/\.mdx?$/, '');
    const fullPath = path.join(notesDirectory, item.name);
    try {
      notes.push(parseNoteFile(fullPath, slug));
    } catch (e) {
      console.error(`Error parsing note ${fullPath}:`, e);
    }
  }

  _allNotes = notes
    .filter(note => process.env.NODE_ENV !== 'production' || !note.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return _allNotes;
}

export function getNoteBySlug(slug: string): NoteData | null {
  if (!fs.existsSync(notesDirectory)) return null;

  const mdxPath = path.join(notesDirectory, `${slug}.mdx`);
  const mdPath = path.join(notesDirectory, `${slug}.md`);

  let fullPath = '';
  if (fs.existsSync(mdxPath)) fullPath = mdxPath;
  else if (fs.existsSync(mdPath)) fullPath = mdPath;
  else return null;

  try {
    const note = parseNoteFile(fullPath, slug);
    if (process.env.NODE_ENV === 'production' && note.draft) return null;
    return note;
  } catch {
    return null;
  }
}

export function getAdjacentNotes(slug: string): { prev: NoteData | null; next: NoteData | null } {
  const allNotes = getAllNotes(); // sorted newest-first
  const index = allNotes.findIndex(n => n.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index < allNotes.length - 1 ? allNotes[index + 1] : null, // older
    next: index > 0 ? allNotes[index - 1] : null, // newer
  };
}

export function getRecentNotes(limit: number = 5): NoteData[] {
  return getAllNotes().slice(0, limit);
}

export function getNoteTags(): Record<string, number> {
  const tags: Record<string, number> = {};
  getAllNotes().forEach(note => {
    note.tags.forEach(tag => {
      const normalized = tag.toLowerCase();
      tags[normalized] = (tags[normalized] || 0) + 1;
    });
  });
  return tags;
}

export function getNotesByTag(tag: string): NoteData[] {
  return getAllNotes().filter(n =>
    n.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
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
