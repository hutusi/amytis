import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';
import GithubSlugger from 'github-slugger';
import { z } from 'zod';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');
const pagesDirectory = path.join(process.cwd(), 'content');
const seriesDirectory = path.join(process.cwd(), 'content', 'series');

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
        if (siteConfig.includeDateInUrl) {
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
                 sSlug = siteConfig.includeDateInUrl ? sRawName : sMatch[2];
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
                       sSlug = siteConfig.includeDateInUrl ? sItem.name : sMatch[2];
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

      if (!siteConfig.showFuturePosts) {
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

  if (siteConfig.includeDateInUrl) {
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

  if (!siteConfig.showFuturePosts) {
      const postDate = new Date(post.date);
      const now = new Date();
      if (postDate > now) return null;
  }
  return post;
}

export function getPageBySlug(slug: string): PostData | null {
  try {
    let fullPath = path.join(pagesDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(pagesDirectory, `${slug}.md`);
    }
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    return parseMarkdownFile(fullPath, slug);
  } catch (error) {
    return null;
  }
}

export function getAllPages(): PostData[] {
  const items = fs.readdirSync(pagesDirectory, { withFileTypes: true });
  return items
    .filter(item => item.isFile() && (item.name.endsWith('.mdx') || item.name.endsWith('.md')))
    .map(item => {
      const slug = item.name.replace(/\.mdx?$/, '');
      const fullPath = path.join(pagesDirectory, item.name);
      return parseMarkdownFile(fullPath, slug);
    });
}

export function getPostsByTag(tag: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export function getAllTags(): Record<string, number> {
  const allPosts = getAllPosts();
  const tags: Record<string, number> = {};

  allPosts.forEach((post) => {
    post.tags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      if (tags[normalizedTag]) {
        tags[normalizedTag] += 1;
      } else {
        tags[normalizedTag] = 1;
      }
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
