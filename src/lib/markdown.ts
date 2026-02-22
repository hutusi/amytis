import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';
import GithubSlugger from 'github-slugger';
import { z } from 'zod';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');
const pagesDirectory = path.join(process.cwd(), 'content');
const seriesDirectory = path.join(process.cwd(), 'content', 'series');
const booksDirectory = path.join(process.cwd(), 'content', 'books');
const flowsDirectory = path.join(process.cwd(), 'content', 'flows');
const notesDirectory = path.join(process.cwd(), 'content', 'notes');

const ExternalLinkSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

const PostSchema = z.object({
  title: z.string(),
  date: z.union([z.string(), z.date()]).transform(val => new Date(val).toISOString().split('T')[0]).optional(),
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
  featured: z.boolean().optional().default(false),
  draft: z.boolean().optional().default(false),
  latex: z.boolean().optional().default(false),
  toc: z.boolean().optional().default(true),
  externalLinks: z.array(ExternalLinkSchema).optional().default([]),
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
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  authors: string[];
  layout?: string;
  series?: string;
  coverImage?: string;
  sort?: 'date-desc' | 'date-asc' | 'manual';
  posts?: string[];
  featured?: boolean;
  draft?: boolean;
  latex?: boolean;
  toc?: boolean;
  externalLinks?: ExternalLink[];
  readingTime: string;
  content: string;
  headings: Heading[];
  contentLocales?: Record<string, { content: string; title?: string; excerpt?: string; headings?: Heading[] }>;
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
  plain = plain.replace(/`[^`]*`/g, '');
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
  if (!fs.existsSync(seriesDirectory)) return null;
  const indexPathMdx = path.join(seriesDirectory, seriesSlug, 'index.mdx');
  const indexPathMd = path.join(seriesDirectory, seriesSlug, 'index.md');

  let fullPath = '';
  if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
  else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
  else return null;

  const { data } = matter(fs.readFileSync(fullPath, 'utf8'));
  if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
    return data.authors;
  }
  if (data.author && typeof data.author === 'string') {
    return [data.author];
  }
  return null;
}

function parseMarkdownFile(fullPath: string, slug: string, dateFromFileName?: string, seriesName?: string): PostData {
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data: rawData, content } = matter(fileContents);

  const parsed = PostSchema.safeParse(rawData);
  if (!parsed.success) {
    console.error(`Invalid frontmatter in ${fullPath}:`, parsed.error.format());
    throw new Error(`Invalid frontmatter in ${fullPath}`);
  }
  const data = parsed.data;

  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();

  let authors: string[] = [];
  if (data.authors && Array.isArray(data.authors)) {
    authors = data.authors;
  } else if (data.author) {
    authors = [data.author];
  } else {
    // Inherit from series if this post belongs to one
    const seriesSlug = data.series || seriesName;
    if (seriesSlug) {
      const seriesAuthors = getSeriesAuthors(seriesSlug);
      if (seriesAuthors) {
        authors = seriesAuthors;
      }
    }
    if (authors.length === 0) {
      authors = ['Amytis'];
    }
  }

  const excerpt = data.excerpt || generateExcerpt(contentWithoutH1);
  const readingTime = calculateReadingTime(contentWithoutH1);
  
  let date = data.date;
  if (!date && dateFromFileName) date = dateFromFileName;
  if (!date) date = new Date().toISOString().split('T')[0]; // Fallback

  const headings = getHeadings(content);

  let coverImage = data.coverImage;
  if (coverImage && !coverImage.startsWith('http') && !coverImage.startsWith('/') && !coverImage.startsWith('text:')) {
    const cleanPath = coverImage.replace(/^\.\//, '');
    coverImage = `/posts/${slug}/${cleanPath}`;
  }

  return {
    slug,
    title: data.title,
    date,
    excerpt,
    category: data.category,
    tags: data.tags,
    authors,
    layout: data.layout,
    series: data.series || seriesName,
    coverImage,
    sort: data.sort,
    posts: data.posts,
    featured: data.featured,
    draft: data.draft,
    latex: data.latex,
    toc: data.toc,
    externalLinks: data.externalLinks,
    readingTime,
    content: contentWithoutH1,
    headings,
  };
}

export function getAllPosts(): PostData[] {
  const allPostsData: PostData[] = [];

  // Helper to process a directory
  const processDirectory = (dir: string, isSeriesDir: boolean = false) => {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });

    items.forEach((item) => {
      let fullPath = '';
      let slug = '';
      let dateFromFileName = undefined;

      const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
      const rawName = item.name.replace(/\.mdx?$/, '');
      const match = rawName.match(dateRegex);
      
      if (match) {
        dateFromFileName = match[1];
        if (siteConfig.posts?.includeDateInUrl) {
          slug = rawName;
        } else {
          slug = match[2];
        }
      } else {
        slug = rawName;
      }

      // Handle Series Directory logic
      if (isSeriesDir) {
        if (item.isDirectory()) {
           const seriesSlug = item.name; // Folder name is series slug
           const seriesPath = path.join(dir, item.name);
           const seriesItems = fs.readdirSync(seriesPath, { withFileTypes: true });
           
           seriesItems.forEach(sItem => {
             // Skip series metadata file itself
             if (sItem.name === 'index.md' || sItem.name === 'index.mdx') return;

             // 1. File-based posts: series/slug/post.mdx
             if (sItem.isFile() && (sItem.name.endsWith('.md') || sItem.name.endsWith('.mdx'))) {
               const sRawName = sItem.name.replace(/\.mdx?$/, '');
               const sMatch = sRawName.match(dateRegex);
               let sSlug = sRawName;
               let sDate = undefined;
               if (sMatch) {
                 sDate = sMatch[1];
                 sSlug = siteConfig.posts?.includeDateInUrl ? sRawName : sMatch[2];
               }
               
               allPostsData.push(parseMarkdownFile(
                 path.join(seriesPath, sItem.name), 
                 sSlug, 
                 sDate, 
                 seriesSlug 
               ));
             } 
             // 2. Folder-based posts: series/slug/post-folder/index.mdx
             else if (sItem.isDirectory()) {
                 const postFolder = path.join(seriesPath, sItem.name);
                 const postIndexMdx = path.join(postFolder, 'index.mdx');
                 const postIndexMd = path.join(postFolder, 'index.md');
                 let postFullPath = '';
                 
                 if (fs.existsSync(postIndexMdx)) postFullPath = postIndexMdx;
                 else if (fs.existsSync(postIndexMd)) postFullPath = postIndexMd;
                 
                 if (postFullPath) {
                     // Handle date prefix in folder name
                     const sMatch = sItem.name.match(dateRegex);
                     let sSlug = sItem.name;
                     let sDate = undefined;
                     
                     if (sMatch) {
                       sDate = sMatch[1];
                       sSlug = siteConfig.posts?.includeDateInUrl ? sItem.name : sMatch[2];
                     }

                     allPostsData.push(parseMarkdownFile(
                       postFullPath, 
                       sSlug, 
                       sDate, 
                       seriesSlug 
                     ));
                 }
             }
           });
           return; // Processed this series folder
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

  return allPostsData
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
}

function findPostFile(name: string, targetSlug: string): PostData | null {
  // Check standard posts
  let fullPath = path.join(contentDirectory, `${name}.mdx`);
  if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug);
  
  fullPath = path.join(contentDirectory, `${name}.md`);
  if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug);

  if (fs.existsSync(path.join(contentDirectory, name))) {
    fullPath = path.join(contentDirectory, name, 'index.mdx');
    if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug);
    
    fullPath = path.join(contentDirectory, name, 'index.md');
    if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug);
  }

  // Check series posts
  if (fs.existsSync(seriesDirectory)) {
    const seriesFolders = fs.readdirSync(seriesDirectory);
    for (const folder of seriesFolders) {
      const folderPath = path.join(seriesDirectory, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      // Check file-based
      fullPath = path.join(folderPath, `${name}.mdx`);
      if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug, undefined, folder);

      fullPath = path.join(folderPath, `${name}.md`);
      if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug, undefined, folder);

      // Check folder-based
      const postFolderPath = path.join(folderPath, name);
      if (fs.existsSync(postFolderPath) && fs.statSync(postFolderPath).isDirectory()) {
         fullPath = path.join(postFolderPath, 'index.mdx');
         if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug, undefined, folder);
         
         fullPath = path.join(postFolderPath, 'index.md');
         if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug, undefined, folder);
      }
    }
  }

  return null;
}

export function getPostBySlug(slug: string): PostData | null {
  let post: PostData | null = null;

  if (siteConfig.posts?.includeDateInUrl) {
    post = findPostFile(slug, slug);
  } else {
    post = findPostFile(slug, slug);
    if (!post) {
        // Search in content/posts
        const items = fs.existsSync(contentDirectory) ? fs.readdirSync(contentDirectory) : [];
        for (const item of items) {
          const rawName = item.replace(/\.mdx?$/, '');
          const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
          const match = rawName.match(dateRegex);
          
          if (match && match[2] === slug) {
            post = findPostFile(rawName, slug);
            break;
          }
        }

        // If not found, search in series folders
        if (!post && fs.existsSync(seriesDirectory)) {
           const seriesFolders = fs.readdirSync(seriesDirectory);
           for (const folder of seriesFolders) {
             const folderPath = path.join(seriesDirectory, folder);
             if (!fs.statSync(folderPath).isDirectory()) continue;
             
             const sItems = fs.readdirSync(folderPath);
             for (const sItem of sItems) {
                const sRawName = sItem.replace(/\.mdx?$/, '');
                // Also check folders
                const sDateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
                const sMatch = sRawName.match(sDateRegex);
                
                if (sMatch && sMatch[2] === slug) {
                  post = findPostFile(sRawName, slug);
                  break;
                }
             }
             if (post) break;
           }
        }
    }
  }

  if (!post) return null;

  if (process.env.NODE_ENV === 'production' && post.draft) {
    return null;
  }

  if (!siteConfig.posts?.showFuturePosts) {
      const postDate = new Date(post.date);
      const now = new Date();
      if (postDate > now) return null;
  }
  return post;
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
  const items = fs.readdirSync(pagesDirectory, { withFileTypes: true });
  return items
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
  const allPosts = getAllPosts();
  const allFlows = getAllFlows();
  const allNotes = getAllNotes();
  const tags: Record<string, number> = {};

  allPosts.forEach((post) => {
    post.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      tags[normalizedTag] = (tags[normalizedTag] || 0) + 1;
    });
  });

  allFlows.forEach((flow) => {
    flow.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      tags[normalizedTag] = (tags[normalizedTag] || 0) + 1;
    });
  });

  allNotes.forEach((note) => {
    note.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      tags[normalizedTag] = (tags[normalizedTag] || 0) + 1;
    });
  });

  return tags;
}

export function getPostsByAuthor(author: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.authors.map(a => a.toLowerCase()).includes(author.toLowerCase())
  );
}

export function getAuthorSlug(author: string): string {
  const slugger = new GithubSlugger();
  return slugger.slug(author.trim());
}

export function getAllAuthors(): Record<string, number> {
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

  return related;
}

export function getSeriesPosts(seriesName: string): PostData[] {
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
  
  return posts;
}

export function getAllSeries(): Record<string, PostData[]> {
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
    series[slug] = getSeriesPosts(slug);
  });

  return series;
}

export function getFeaturedPosts(): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter(post => post.featured);
}

export function getAdjacentPosts(slug: string): { prev: PostData | null; next: PostData | null } {
  const allPosts = getAllPosts(); // sorted desc by date (newest first)
  const index = allPosts.findIndex(p => p.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index < allPosts.length - 1 ? allPosts[index + 1] : null, // older post
    next: index > 0 ? allPosts[index - 1] : null,                   // newer post
  };
}

export function getFeaturedSeries(): Record<string, PostData[]> {
  const allSeries = getAllSeries();
  const featuredSeries: Record<string, PostData[]> = {};
  
  Object.keys(allSeries).forEach(slug => {
    const seriesData = getSeriesData(slug);
    if (seriesData?.featured) {
      featuredSeries[slug] = allSeries[slug];
    }
  });
  
  return featuredSeries;
}

export function getSeriesData(slug: string): PostData | null {
  if (!fs.existsSync(seriesDirectory)) return null;
  const indexPathMdx = path.join(seriesDirectory, slug, 'index.mdx');
  const indexPathMd = path.join(seriesDirectory, slug, 'index.md');
  
  let fullPath = '';
  if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
  else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
  else return null;

  return parseMarkdownFile(fullPath, slug, undefined, slug);
}

// ─── Books ──────────────────────────────────────────────────────────────────

export interface BookChapterEntry {
  title: string;
  file: string;
  part?: string;
}

export interface BookTocPart {
  part: string;
  chapters: { title: string; file: string }[];
}
export type BookTocItem = BookTocPart | { title: string; file: string };

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
  readingTime: string;
  prevChapter: { title: string; file: string } | null;
  nextChapter: { title: string; file: string } | null;
}

const BookChapterRefSchema = z.object({
  title: z.string(),
  file: z.string(),
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
});

function flattenBookChapters(toc: BookTocItem[]): BookChapterEntry[] {
  const result: BookChapterEntry[] = [];
  for (const item of toc) {
    if ('part' in item) {
      for (const ch of item.chapters) {
        result.push({ title: ch.title, file: ch.file, part: item.part });
      }
    } else {
      result.push({ title: item.title, file: item.file });
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
    const chMdx = path.join(bookDir, `${ch.file}.mdx`);
    const chMd = path.join(bookDir, `${ch.file}.md`);
    if (!fs.existsSync(chMdx) && !fs.existsSync(chMd)) {
      console.warn(`Book "${slug}": chapter file "${ch.file}" not found`);
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
  let fullPath = '';
  if (fs.existsSync(chMdx)) fullPath = chMdx;
  else if (fs.existsSync(chMd)) fullPath = chMd;
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
  const chapterIndex = book.chapters.findIndex(ch => ch.file === chapterSlug);
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
    readingTime,
    prevChapter: prevChapter ? { title: prevChapter.title, file: prevChapter.file } : null,
    nextChapter: nextChapter ? { title: nextChapter.title, file: nextChapter.file } : null,
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
});

export interface FlowData {
  slug: string;
  date: string;
  title: string;
  tags: string[];
  draft: boolean;
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

  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();
  const date = data.date || slug.replace(/\//g, '-'); // slug is YYYY/MM/DD, convert to YYYY-MM-DD
  const excerpt = generateExcerpt(contentWithoutH1);
  const headings = getHeadings(content);

  return {
    slug,
    date,
    title: data.title ?? date, // fall back to date string if no title in frontmatter
    tags: data.tags,
    draft: data.draft,
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
  const date = data.date || new Date().toISOString().split('T')[0];
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
    content: contentWithoutH1,
    excerpt,
    headings,
    readingTime,
  };
}

let _allNotes: NoteData[] | null = null;

export function getAllNotes(): NoteData[] {
  if (_allNotes) return _allNotes;

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
  if (_slugRegistry) return _slugRegistry;

  const map = new Map<string, SlugRegistryEntry>();

  getAllPosts().forEach(p =>
    map.set(p.slug, { url: `/posts/${p.slug}`, type: 'post', title: p.title })
  );

  getAllFlows().forEach(f =>
    map.set(f.slug, { url: `/flows/${f.slug}`, type: 'flow', title: f.title })
  );

  getAllNotes().forEach(n => {
    map.set(n.slug, { url: `/notes/${n.slug}`, type: 'note', title: n.title });
    n.aliases.forEach(a =>
      map.set(a, { url: `/notes/${n.slug}`, type: 'note', title: n.title })
    );
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

  if (start > 0) ctx = ctx.replace(/^[^\s.!?]*/, '').trimStart();
  if (end < text.length) ctx = ctx.replace(/[^\s.!?]*$/, '').trimEnd();

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

  getAllPosts().forEach(p => addBacklinks(p.content, p.slug, p.title, 'post', `/posts/${p.slug}`));
  getAllNotes().forEach(n => addBacklinks(n.content, n.slug, n.title, 'note', `/notes/${n.slug}`));
  getAllFlows().forEach(f => addBacklinks(f.content, f.slug, f.title, 'flow', `/flows/${f.slug}`));

  return index;
}

let _backlinkIndex: Map<string, BacklinkSource[]> | null = null;

export function getBacklinks(slug: string): BacklinkSource[] {
  if (!_backlinkIndex) _backlinkIndex = buildBacklinkIndex();
  return _backlinkIndex.get(slug) ?? [];
}
