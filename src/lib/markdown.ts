import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';
import GithubSlugger from 'github-slugger';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');
const pagesDirectory = path.join(process.cwd(), 'content');

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
  const text = content.replace(/<\/?[^>]+(>|$)/g, "").replace(/[#*`~[\]()]/g, "");
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
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

function parseMarkdownFile(fullPath: string, slug: string, dateFromFileName?: string): PostData {
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

  return {
    slug,
    title: data.title,
    date,
    excerpt,
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    authors,
    layout: data.layout || 'post',
    draft: data.draft || false,
    latex: data.latex || false,
    toc: data.toc !== false,
    readingTime,
    content: contentWithoutH1,
    headings,
  };
}

export function getAllPosts(): PostData[] {
  const items = fs.readdirSync(contentDirectory, { withFileTypes: true });
  const allPostsData: PostData[] = [];

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

    if (item.isFile()) {
      if (!item.name.endsWith('.mdx') && !item.name.endsWith('.md')) return;
      fullPath = path.join(contentDirectory, item.name);
    } else if (item.isDirectory()) {
      const indexPathMdx = path.join(contentDirectory, item.name, 'index.mdx');
      const indexPathMd = path.join(contentDirectory, item.name, 'index.md');
      if (fs.existsSync(indexPathMdx)) fullPath = indexPathMdx;
      else if (fs.existsSync(indexPathMd)) fullPath = indexPathMd;
      else return;
    } else {
      return;
    }

    allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName));
  });

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

// Helper to find file based on full name (with or without extension)
function findPostFile(name: string, targetSlug: string): PostData | null {
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

  return null;
}

export function getPostBySlug(slug: string): PostData | null {
  let post: PostData | null = null;

  if (siteConfig.includeDateInUrl) {
    post = findPostFile(slug, slug);
  } else {
    post = findPostFile(slug, slug);
    if (!post) {
        const items = fs.readdirSync(contentDirectory);
        for (const item of items) {
          const rawName = item.replace(/\.mdx?$/, '');
          const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
          const match = rawName.match(dateRegex);
          
          if (match && match[2] === slug) {
            post = findPostFile(rawName, slug);
            break;
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
