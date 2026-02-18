import { getBookData, getBookChapter, getAllBooks } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../site.config';
import BookLayout from '@/layouts/BookLayout';
import { resolveLocale } from '@/lib/i18n';

export async function generateStaticParams() {
  const books = getAllBooks();
  const params: { slug: string; chapter: string }[] = [];

  for (const book of books) {
    for (const ch of book.chapters) {
      params.push({ slug: book.slug, chapter: ch.file });
    }
  }

  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; chapter: string }> }): Promise<Metadata> {
  const { slug: rawSlug, chapter: rawChapter } = await params;
  const slug = decodeURIComponent(rawSlug);
  const chapterSlug = decodeURIComponent(rawChapter);

  const book = getBookData(slug);
  const chapter = getBookChapter(slug, chapterSlug);

  if (!book || !chapter) {
    return { title: 'Chapter Not Found' };
  }

  return {
    title: `${chapter.title} - ${book.title} | ${resolveLocale(siteConfig.title)}`,
    description: chapter.excerpt,
  };
}

export default async function BookChapterPage({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug: rawSlug, chapter: rawChapter } = await params;
  const slug = decodeURIComponent(rawSlug);
  const chapterSlug = decodeURIComponent(rawChapter);

  const book = getBookData(slug);
  const chapter = getBookChapter(slug, chapterSlug);

  if (!book || !chapter) {
    notFound();
  }

  return <BookLayout book={book} chapter={chapter} />;
}
