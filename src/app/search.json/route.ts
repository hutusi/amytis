import { getAllPosts, getAllBooks, getBookChapter } from '@/lib/markdown';

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
        });
      }
    }
  }

  return Response.json(searchIndex);
}
