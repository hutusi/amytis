import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { siteConfig } from '../../site.config';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');
const pagesDirectory = path.join(process.cwd(), 'content');

export interface PostData {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  authors: string[];
  layout?: string;
  content: string;
}

/**
 * Generates a plain text excerpt from markdown content by stripping formatting.
 */
export function generateExcerpt(content: string): string {
  let plain = content.replace(/^#+\s+/gm, '');
  plain = plain.replace(/```[\s\S]*?```/g, '');
  plain = plain.replace(/![[^]]*\]\([^)]+\)/g, '');
  plain = plain.replace(/[[^]]+\]\([^)]+\)/g, '$1');
  plain = plain.replace(/(\*\*|__|\*|_)/g, '');
  plain = plain.replace(/`[^`]*`/g, '');
  plain = plain.replace(/^>\s+/gm, '');
  plain = plain.replace(/\s+/g, ' ').trim();
  
  if (plain.length <= 160) {
    return plain;
  }
  return plain.slice(0, 160).trim() + '...';
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
  
  // Priority: Frontmatter Date > Filename Date
  let date = data.date;
  if (!date && dateFromFileName) {
    date = dateFromFileName;
  }
  
  // Normalize date
  date = date instanceof Date ? date.toISOString().split('T')[0] : (date || '');

  return {
    slug,
    title: data.title,
    date: date,
    excerpt: excerpt,
    category: data.category || 'Uncategorized',
    tags: data.tags || [],
    authors: authors,
    layout: data.layout || 'post',
    content: contentWithoutH1,
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

    if (item.isFile()) {
      if (item.name.endsWith('.mdx') || item.name.endsWith('.md')) {
        const fileNameNoExt = item.name.replace(/\.mdx?$/, '');
        const match = fileNameNoExt.match(dateRegex);
        
        if (match) {
          dateFromFileName = match[1];
          if (siteConfig.includeDateInUrl) {
            slug = fileNameNoExt;
          } else {
            slug = match[2];
          }
        } else {
          slug = fileNameNoExt;
        }
        
        fullPath = path.join(contentDirectory, item.name);
      } else {
        return;
      }
    } else if (item.isDirectory()) {
      // Directory handling (nested posts)
      // Check if directory name has date? Assuming directory name = slug
      // If directory is '2026-01-12-post', handle same logic.
      const match = item.name.match(dateRegex);
      if (match) {
        dateFromFileName = match[1];
        if (siteConfig.includeDateInUrl) {
          slug = item.name;
        } else {
          slug = match[2];
        }
      } else {
        slug = item.name;
      }

      const indexPathMdx = path.join(contentDirectory, item.name, 'index.mdx');
      const indexPathMd = path.join(contentDirectory, item.name, 'index.md');

      if (fs.existsSync(indexPathMdx)) {
        fullPath = indexPathMdx;
      } else if (fs.existsSync(indexPathMd)) {
        fullPath = indexPathMd;
      } else {
        return;
      }
    } else {
      return;
    }

    allPostsData.push(parseMarkdownFile(fullPath, slug, dateFromFileName));
  });

  return allPostsData
    .filter(post => post.category !== 'Page')
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): PostData | null {
  // If includeDateInUrl is true, slug includes date, standard lookup works.
  // If false, slug is just title. We need to find the file/dir.
  
  if (siteConfig.includeDateInUrl) {
    // Standard lookup
    return findPostFile(slug);
  } else {
    // Try standard lookup first (non-dated file)
    let post = findPostFile(slug);
    if (post) return post;

    // Scan directory for dated file matching slug
    const items = fs.readdirSync(contentDirectory);
    for (const item of items) {
      const fileNameNoExt = item.replace(/\.mdx?$/, '');
      const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
      const match = fileNameNoExt.match(dateRegex);
      
      if (match && match[2] === slug) {
        // Found matching dated file/dir
        return findPostFile(fileNameNoExt); // Pass the full name to findPostFile
      }
    }
    return null;
  }
}

// Helper to find file based on full name (with or without extension)
function findPostFile(name: string): PostData | null {
  // Try file direct (name + .mdx/.md)
  let fullPath = path.join(contentDirectory, `${name}.mdx`);
  if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, getSlugFromName(name));
  
  fullPath = path.join(contentDirectory, `${name}.md`);
  if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, getSlugFromName(name));

  // Try directory
  if (fs.existsSync(path.join(contentDirectory, name))) {
    fullPath = path.join(contentDirectory, name, 'index.mdx');
    if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, getSlugFromName(name));
    
    fullPath = path.join(contentDirectory, name, 'index.md');
    if (fs.existsSync(fullPath)) return parseMarkdownFile(fullPath, getSlugFromName(name));
  }

  return null;
}

function getSlugFromName(name: string): string {
  if (siteConfig.includeDateInUrl) return name;
  const dateRegex = /^(\d{4}-\d{2}-\d{2})-(.*)$/;
  const match = name.match(dateRegex);
  return match ? match[2] : name;
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