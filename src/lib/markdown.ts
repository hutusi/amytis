import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';
import GithubSlugger from 'github-slugger';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');
const pagesDirectory = path.join(process.cwd(), 'content');
const seriesDirectory = path.join(process.cwd(), 'content', 'series');

export interface Heading {
  id: string;
  text: string;
  level: number;
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
  draft?: boolean;
  latex?: boolean;
  toc?: boolean;
  readingTime: string;
  content: string;
  headings: Heading[];
}

function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  // Strip tags and special chars roughly for word count
  const text = content.replace(/<\/?[^>]+(>|$)/g, "").replace(/[#*`~[\\\]()]/g, "");
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

export function generateExcerpt(content: string): string {
  let plain = content.replace(/^#+\s+/gm, '');
  plain = plain.replace(/```[\s\S]*?```/g, '');
  plain = plain.replace(/!\[[^]]*\]\([^)]+\)/g, '');
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

function getHeadings(content: string): Heading[] {
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

function parseMarkdownFile(fullPath: string, slug: string, dateFromFileName?: string, seriesName?: string): PostData {
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  
  const contentWithoutH1 = content.replace(/^\s*#\s+[^\n]+/, '').trim();

  let authors: string[] = [];
  if (data.authors && Array.isArray(data.authors)) {
    authors = data.authors;
  } else if (data.author) {
    authors = [data.author];
  } else {
    authors = ['Amytis'];
  }

  const excerpt = data.excerpt || generateExcerpt(contentWithoutH1);
  const readingTime = calculateReadingTime(contentWithoutH1);
  
  let date = data.date;
  if (!date && dateFromFileName) date = dateFromFileName;
  date = date instanceof Date ? date.toISOString().split('T')[0] : (date || new Date().toISOString().split('T')[0]);

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
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    authors,
    layout: data.layout || 'post',
    series: data.series || seriesName,
    coverImage,
    draft: data.draft || false,
    latex: data.latex || false,
    toc: data.toc !== false,
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
           const seriesSlug = item.name;
           const seriesPath = path.join(dir, item.name);
           const seriesItems = fs.readdirSync(seriesPath, { withFileTypes: true });
           
           seriesItems.forEach(sItem => {
             if (sItem.name === 'index.md' || sItem.name === 'index.mdx') return;
             if (!sItem.isFile() || (!sItem.name.endsWith('.md') && !sItem.name.endsWith('.mdx'))) return;

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
           });
           return;
        }
      }

      // Standard Posts logic
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

      fullPath = path.join(folderPath, `${name}.mdx`);
      if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug, undefined, folder);

      fullPath = path.join(folderPath, `${name}.md`);
      if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, targetSlug, undefined, folder);
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
  const allPosts = getAllPosts();
  return allPosts
    .filter(post => post.series === seriesName)
    .sort((a, b) => (a.date > b.date ? 1 : -1)); // Chronological order (oldest first)
}

export function getAllSeries(): Record<string, PostData[]> {
  const allPosts = getAllPosts();
  const series: Record<string, PostData[]> = {};

  allPosts.forEach((post) => {
    if (post.series) {
      if (!series[post.series]) {
        series[post.series] = [];
      }
      series[post.series].push(post);
    }
  });

  // Sort posts within series
  Object.keys(series).forEach(key => {
    series[key].sort((a, b) => (a.date > b.date ? 1 : -1));
  });

  return series;
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