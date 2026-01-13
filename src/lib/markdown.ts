import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content', 'posts');

export interface PostData {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  authors: string[];
  content: string;
}

/**
 * Generates a plain text excerpt from markdown content by stripping formatting.
 * Used as a fallback when no excerpt is provided in the frontmatter.
 */
export function generateExcerpt(content: string): string {
  // Remove headers (e.g. # Header)
  let plain = content.replace(/^#+\s+/gm, '');
  // Remove code blocks
  plain = plain.replace(/```[\s\S]*?```/g, '');
  // Remove images
  plain = plain.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
  // Remove links (keep text)
  plain = plain.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove bold/italic
  plain = plain.replace(/(\*\*|__|\*|_)/g, '');
  // Remove inline code
  plain = plain.replace(/`[^`]*`/g, '');
  // Remove blockquotes
  plain = plain.replace(/^>\s+/gm, '');
  
  // Normalize whitespace (replace newlines with spaces, collapse multiple spaces)
  plain = plain.replace(/\s+/g, ' ').trim();
  
  if (plain.length <= 160) {
    return plain;
  }
  
  return plain.slice(0, 160).trim() + '...';
}

/**
 * Retrieves all MDX posts from the content directory, sorted by date (descending).
 */
export function getAllPosts(): PostData[] {
  const fileNames = fs.readdirSync(contentDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.mdx') || fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, '');
      const fullPath = path.join(contentDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);
      
      // Remove the first H1 heading if present to avoid duplication with the page title
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
      const date = data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date;

      return {
        slug,
        title: data.title,
        date: date,
        excerpt: excerpt,
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        authors: authors,
        content: contentWithoutH1,
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Retrieves a single post by its slug. Returns null if not found.
 */
export function getPostBySlug(slug: string): PostData | null {
  try {
    let fullPath = path.join(contentDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(contentDirectory, `${slug}.md`);
    }
    
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // Remove the first H1 heading if present to avoid duplication with the page title
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
    const date = data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date;

    return {
      slug,
      title: data.title,
      date: date,
      excerpt: excerpt,
      category: data.category || 'Uncategorized',
      tags: data.tags || [],
      authors: authors,
      content: contentWithoutH1,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Filters posts by a specific tag (case-insensitive).
 */
export function getPostsByTag(tag: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

/**
 * Returns a map of all tags and their occurrence counts.
 */
export function getAllTags(): Record<string, number> {
  const allPosts = getAllPosts();
  const tags: Record<string, number> = {};

  allPosts.forEach((post) => {
    post.tags.forEach((tag) => {
      // Normalize tag to lowercase for consistent counting/URLs
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

/**
 * Filters posts by a specific author (case-insensitive).
 */
export function getPostsByAuthor(author: string): PostData[] {
  const allPosts = getAllPosts();
  return allPosts.filter((post) => 
    post.authors.map(a => a.toLowerCase()).includes(author.toLowerCase())
  );
}

/**
 * Returns a map of all authors and their post counts.
 */
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