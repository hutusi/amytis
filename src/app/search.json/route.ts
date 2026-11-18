import { getAllPosts } from '@/lib/content/posts';
import { getAllNotes } from '@/lib/content/notes';
import { getAllFlows } from '@/lib/content/flows';
import { getAllBooks, getBookChapter } from '@/lib/content/books';
import { stripMarkdown } from '@/lib/search-utils';
import { isFeatureEnabled } from '@/lib/features';
import { getBookChapterUrl, getNonDefaultLocales, getNoteUrl, getPostUrl, localizeUrl } from '@/lib/urls';
import { siteConfig } from '../../../site.config';

export const dynamic = 'force-static';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

export async function GET() {
  const posts = getAllPosts();
  // Index only content whose pages are built: books have their own feature,
  // notes and flows belong to `flow`.
  const booksEnabled = isFeatureEnabled('books');
  const flowEnabled = isFeatureEnabled('flow');

  const searchIndex: Record<string, unknown>[] = posts.map((post) => ({
    title: post.title,
    slug: post.slug,
    date: post.date,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    content: stripMarkdown(post.content),
    lang: DEFAULT_LOCALE,
  }));

  // Add book chapters to search index
  const books = booksEnabled ? getAllBooks() : [];
  for (const book of books) {
    for (const ch of book.chapters) {
      const chapter = getBookChapter(book.slug, ch.id);
      if (chapter) {
        searchIndex.push({
          title: `${chapter.title} — ${book.title}`,
          slug: `books/${book.slug}/${ch.id}`,
          date: book.date,
          excerpt: chapter.excerpt || '',
          category: 'Book',
          tags: [],
          content: stripMarkdown(chapter.content),
          lang: DEFAULT_LOCALE,
        });
      }
    }
  }

  // Add flows to search index
  const flows = flowEnabled ? getAllFlows() : [];
  for (const flow of flows) {
    searchIndex.push({
      title: flow.title,
      slug: `flows/${flow.slug}`,
      date: flow.date,
      excerpt: flow.excerpt,
      category: 'Flow',
      tags: flow.tags,
      content: stripMarkdown(flow.content),
      lang: DEFAULT_LOCALE,
    });
  }

  // Add notes to search index
  const notes = flowEnabled ? getAllNotes() : [];
  for (const note of notes) {
    searchIndex.push({
      title: note.title,
      slug: `notes/${note.slug}`,
      date: note.date,
      excerpt: note.excerpt,
      category: 'Note',
      tags: note.tags,
      content: stripMarkdown(note.content),
      lang: DEFAULT_LOCALE,
    });
  }

  // Locale trees — indexed in full, INCLUDING twins: a translation is
  // distinct searchable text, not a duplicate of its canonical item. Entries
  // carry locale-prefixed URL paths as their slug so results link into the
  // /<locale>/ surface.
  for (const locale of getNonDefaultLocales()) {
    for (const post of getAllPosts(locale)) {
      searchIndex.push({
        title: post.title,
        slug: getPostUrl(post).replace(/^\//, ''),
        date: post.date,
        excerpt: post.excerpt,
        category: post.category,
        tags: post.tags,
        content: stripMarkdown(post.content),
        lang: locale,
      });
    }
    for (const book of booksEnabled ? getAllBooks(locale) : []) {
      for (const ch of book.chapters) {
        const chapter = getBookChapter(book.slug, ch.id, locale);
        if (!chapter) continue;
        searchIndex.push({
          title: `${chapter.title} — ${book.title}`,
          slug: localizeUrl(getBookChapterUrl(book.slug, ch.id), locale).replace(/^\//, ''),
          date: book.date,
          excerpt: chapter.excerpt || '',
          category: 'Book',
          tags: [],
          content: stripMarkdown(chapter.content),
          lang: locale,
        });
      }
    }
    for (const note of flowEnabled ? getAllNotes(locale) : []) {
      searchIndex.push({
        title: note.title,
        slug: localizeUrl(getNoteUrl(note.slug), locale).replace(/^\//, ''),
        date: note.date,
        excerpt: note.excerpt,
        category: 'Note',
        tags: note.tags,
        content: stripMarkdown(note.content),
        lang: locale,
      });
    }
  }

  return Response.json(searchIndex);
}
