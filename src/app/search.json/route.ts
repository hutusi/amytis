import { getAllPosts, getAllBooks, getBookChapter, getAllFlows, getAllNotes } from '@/lib/markdown';
import { stripMarkdown } from '@/lib/search-utils';

export const dynamic = 'force-static';

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

  // Add notes to search index
  const notes = getAllNotes();
  for (const note of notes) {
    searchIndex.push({
      title: note.title,
      slug: `notes/${note.slug}`,
      date: note.date,
      excerpt: note.excerpt,
      category: 'Note',
      tags: note.tags,
      content: stripMarkdown(note.content),
    });
  }

  return Response.json(searchIndex);
}
