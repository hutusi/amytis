import { getBookData, getBookChapter, getAllBooks } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../site.config';
import BookLayout from '@/layouts/BookLayout';
import { resolveLocale } from '@/lib/i18n';
import { buildBookChapterJsonLd, serializeJsonLd } from '@/lib/json-ld';
import { getBookUrl, getBookChapterUrl } from '@/lib/urls';

export async function generateStaticParams() {
  const books = getAllBooks();
  if (books.length === 0) return [{ slug: '_', chapter: '_' }];
  const params: { slug: string; chapter: string }[] = [];

  for (const book of books) {
    for (const ch of book.chapters) {
      // Only include chapters whose files exist and parse successfully.
      // A chapter listed in index.mdx but not yet written (or with invalid
      // frontmatter) would cause notFound() at render time, which in
      // output:export dev mode surfaces as a confusing "missing param" 500.
      if (getBookChapter(book.slug, ch.id) !== null) {
        params.push({ slug: book.slug, chapter: ch.id });
      }
    }
  }

  // Ensure we never return an empty array with output: export
  return params.length > 0 ? params : [{ slug: '_', chapter: '_' }];
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

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const jsonLd = buildBookChapterJsonLd({
    chapter,
    book,
    chapterUrl: `${siteUrl}${getBookChapterUrl(slug, chapterSlug)}`,
    bookUrl: `${siteUrl}${getBookUrl(slug)}`,
    siteTitle: resolveLocale(siteConfig.title),
    siteUrl,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <BookLayout book={book} chapter={chapter} />
    </>
  );
}
