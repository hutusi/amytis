import { getAllPosts, getAllBooks, getBookChapter, getAllFlows } from '@/lib/markdown';

export const dynamic = 'force-static';

/** Strip markdown/MDX syntax to plain text for full-content indexing. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
    .replace(/`[^`\n]+`/g, ' ')                // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')            // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links → text
    .replace(/<[^>]+>/g, ' ')                   // HTML/JSX/MDX tags
    .replace(/^#{1,6}\s+/gm, '')               // heading markers
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1') // bold/italic (*)
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, '$1')   // bold/italic (_)
    .replace(/^\s*[-*+>]\s+/gm, '')             // lists + blockquotes
    .replace(/^\s*\d+\.\s+/gm, '')              // ordered lists
    .replace(/\s+/g, ' ')                       // normalize whitespace
    .trim()
    .slice(0, 2000);                             // cap for index size
}

export async function GET() {
  const posts = getAllPosts();

  const searchIndex: Record<string, unknown>[] = posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    content: stripMarkdown(post.content),
  }));

  // Add book chapters to search index
  const books = getAllBooks();
  for (const book of books) {
    for (const ch of book.chapters) {
      const chapter = getBookChapter(book.slug, ch.file);
      if (chapter) {
        searchIndex.push({
          title: `${chapter.title} — ${book.title}`,
          slug: `books/${book.slug}/${ch.file}`,
          date: book.date,
          excerpt: chapter.excerpt || '',
          category: 'Book',
          tags: [],
          content: stripMarkdown(chapter.content),
        });
      }
    }
  }

  // Add flows to search index
  const flows = getAllFlows();
  for (const flow of flows) {
    searchIndex.push({
      title: flow.title,
      slug: `flows/${flow.slug}`,
      date: flow.date,
      excerpt: flow.excerpt,
      category: 'Flow',
      tags: flow.tags,
      content: stripMarkdown(flow.content),
    });
  }

  return Response.json(searchIndex);
}
