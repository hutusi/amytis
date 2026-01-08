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
  author: string;
  content: string;
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

      return {
        slug,
        title: data.title,
        date: data.date,
        excerpt: data.excerpt,
        category: data.category || 'Uncategorized',
        tags: data.tags || [],
        author: data.author || 'Amytis',
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

    return {
      slug,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt,
      category: data.category || 'Uncategorized',
      tags: data.tags || [],
      author: data.author || 'Amytis',
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
    post.author.toLowerCase() === author.toLowerCase()
  );
}

export function getAllAuthors(): Record<string, number> {
  const allPosts = getAllPosts();
  const authors: Record<string, number> = {};

  allPosts.forEach((post) => {
    const author = post.author;
    // We can normalize author names if we want, but keeping original case for display is nice.
    // However, for counting/slugs, we might want a normalized key.
    // For simplicity, let's assume author names are consistent or just use the string as is for the key.
    // To be safe for URLs, we'll usually use a slugified version, but here let's just count.
    if (authors[author]) {
      authors[author] += 1;
    } else {
      authors[author] = 1;
    }
  });

  return authors;
}
