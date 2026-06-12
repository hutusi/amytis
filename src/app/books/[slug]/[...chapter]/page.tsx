import { getBookData, getBookChapter, getAllBooks } from '@/lib/content/books';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../site.config';
import BookLayout from '@/layouts/BookLayout';
import { resolveLocale } from '@/lib/i18n';
import { buildBookChapterJsonLd, serializeJsonLd } from '@/lib/json-ld';
import { getBookUrl, getBookChapterUrl } from '@/lib/urls';
import { safeDecodeParam } from '@/lib/route-params';

/**
 * The chapter route is a catch-all (`[...chapter]`) so that nested chapter ids
 * like `maths/linear/introduction` can be served at `/books/<slug>/maths/linear/introduction`
 * — mapping VuePress-style nested folder paths to URLs 1:1. Single-segment legacy
 * ids continue to work since catch-all matches one-or-more segments.
 */

function chapterIdFromParams(rawChapter: string | string[] | undefined): string {
  if (!rawChapter) return '';
  if (Array.isArray(rawChapter)) {
    return rawChapter.map(safeDecodeParam).join('/');
  }
  return safeDecodeParam(rawChapter);
}

function chapterIdToParamSegments(chapterId: string): string[] {
  return chapterId.split('/').filter(Boolean);
}

export async function generateStaticParams() {
  const books = getAllBooks();
  if (books.length === 0) return [{ slug: '_', chapter: ['_'] }];
  const params: { slug: string; chapter: string[] }[] = [];

  for (const book of books) {
    for (const ch of book.chapters) {
      // Only include chapters whose files exist and parse successfully.
      // A chapter listed in index.mdx but not yet written (or with invalid
      // frontmatter) would cause notFound() at render time, which in
      // output:export dev mode surfaces as a confusing "missing param" 500.
      if (getBookChapter(book.slug, ch.id) !== null) {
        params.push({ slug: book.slug, chapter: chapterIdToParamSegments(ch.id) });
      }
    }
  }

  // Ensure we never return an empty array with output: export
  return params.length > 0 ? params : [{ slug: '_', chapter: ['_'] }];
}

export const dynamicParams = false;

type ChapterPageParams = Promise<{ slug: string; chapter: string[] }>;

export async function generateMetadata({ params }: { params: ChapterPageParams }): Promise<Metadata> {
  const { slug: rawSlug, chapter: rawChapter } = await params;
  const slug = safeDecodeParam(rawSlug);
  const chapterSlug = chapterIdFromParams(rawChapter);

  const book = getBookData(slug);
  const chapter = getBookChapter(slug, chapterSlug);

  if (!book || !chapter) {
    return { title: 'Chapter Not Found' };
  }

  const ogImage = book.coverImage && !book.coverImage.startsWith('text:') && !book.coverImage.startsWith('./')
    ? book.coverImage
    : siteConfig.ogImage;

  return {
    title: `${chapter.title} - ${book.title} | ${resolveLocale(siteConfig.title)}`,
    description: chapter.excerpt,
    openGraph: {
      title: `${chapter.title} - ${book.title}`,
      description: chapter.excerpt,
      type: 'article',
      url: `${siteConfig.baseUrl}${getBookChapterUrl(slug, chapterSlug)}`,
      siteName: resolveLocale(siteConfig.title),
      images: [{ url: ogImage, width: 1200, height: 630, alt: chapter.title }],
    },
    twitter: {
      card: ogImage !== siteConfig.ogImage ? 'summary_large_image' : 'summary',
      title: `${chapter.title} - ${book.title}`,
      description: chapter.excerpt,
      images: [ogImage],
    },
  };
}

export default async function BookChapterPage({ params }: { params: ChapterPageParams }) {
  const { slug: rawSlug, chapter: rawChapter } = await params;
  const slug = safeDecodeParam(rawSlug);
  const chapterSlug = chapterIdFromParams(rawChapter);

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
