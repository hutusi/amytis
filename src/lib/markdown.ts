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

export function generateExcerpt(content: string): string {
  // Remove headers
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

export function getAllPosts(): PostData[] {
  const fileNames = fs.readdirSync(contentDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx$/, '');
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

      return {
        slug,
        title: data.title,
        date: data.date,
        excerpt: excerpt,
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        authors: authors,
        content: contentWithoutH1,
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): PostData | null {
  try {
    const fullPath = path.join(contentDirectory, `${slug}.mdx`);
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

    return {
      slug,
      title: data.title,
      date: data.date,
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