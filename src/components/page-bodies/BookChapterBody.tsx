import { getBookData, getBookChapter } from '@/lib/content/books';
import { notFound } from 'next/navigation';
import BookLayout from '@/layouts/BookLayout';
import { resolveLocaleValue } from '@/lib/i18n';
import { buildBookChapterJsonLd, serializeJsonLd } from '@/lib/json-ld';
import { getBookUrl, getBookChapterUrl, localizeUrl, withTrailingSlash } from '@/lib/urls';
import { getBookChapterBreadcrumbs } from '@/lib/breadcrumbs';
import { siteConfig } from '../../../site.config';

interface BookChapterBodyProps {
  locale: string;
  bookSlug: string;
  /** Decoded chapter id, nested segments joined with `/` (e.g. `maths/linear/intro`). */
  chapterId: string;
}

/** Shared body for a book chapter page (`/books/<slug>/<...chapter>` and locale-prefixed variants), JSON-LD included. */
export default function BookChapterBody({ locale, bookSlug, chapterId }: BookChapterBodyProps) {
  const book = getBookData(bookSlug, locale);
  const chapter = getBookChapter(bookSlug, chapterId, locale);

  if (!book || !chapter) {
    notFound();
  }

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const breadcrumbs = getBookChapterBreadcrumbs(book, { id: chapterId, title: chapter.title }, locale);
  const jsonLd = buildBookChapterJsonLd({
    chapter,
    book,
    chapterUrl: withTrailingSlash(`${siteUrl}${localizeUrl(getBookChapterUrl(bookSlug, chapterId), locale)}`),
    bookUrl: withTrailingSlash(`${siteUrl}${localizeUrl(getBookUrl(bookSlug), locale)}`),
    siteTitle: resolveLocaleValue(siteConfig.title, locale),
    siteUrl,
    inLanguage: book.locale,
    breadcrumbs,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <BookLayout book={book} chapter={chapter} breadcrumbs={breadcrumbs} />
    </>
  );
}
