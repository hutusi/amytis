import path from 'path';
import { getBookDirPath, type BookData, type BookChapterData } from '@/lib/content/books';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import BookReadingShell from '@/components/BookReadingShell';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { BreadcrumbItem } from '@/lib/breadcrumbs';
import { getBookChapterUrl, localizeUrl } from '@/lib/urls';
import { siteConfig } from '../../site.config';
import { resolveCommentable } from '@/lib/comments';

interface BookLayoutProps {
  book: BookData;
  chapter: BookChapterData;
  breadcrumbs?: BreadcrumbItem[];
}

export default function BookLayout({ book, chapter, breadcrumbs = [] }: BookLayoutProps) {
  // Everything book-scoped stays in the book's locale tree: source dir for
  // relative-link resolution, public asset dirs, chapter navigation, and the
  // comment thread identity.
  const bookDir = getBookDirPath(book.slug, book.locale);
  const assetPrefix = book.locale === siteConfig.i18n.defaultLocale ? '' : `${book.locale}/`;
  const chapterUrl = (id: string) => localizeUrl(getBookChapterUrl(book.slug, id), book.locale);
  const validChapterIds = new Set(book.chapters.map(c => c.id));

  // `slug` is the public-relative directory used by rehype-image-metadata to
  // resolve `![](./assets/...)`-style refs. For nested flat chapters
  // (e.g. id `maths/linear/vectors`) the image's parent dir is the chapter's
  // parent dir, not the book root — without this, all chapter images point
  // at `/books/<slug>/assets/...` instead of `/books/<slug>/<dir>/assets/...`.
  let imageSlug: string;
  if (chapter.isFolder) {
    imageSlug = `${assetPrefix}books/${book.slug}/${chapter.slug}`;
  } else {
    const parentDir = path.posix.dirname(chapter.slug);
    imageSlug = parentDir === '.' ? `${assetPrefix}books/${book.slug}` : `${assetPrefix}books/${book.slug}/${parentDir}`;
  }

  const prev = chapter.prevChapter
    ? { href: chapterUrl(chapter.prevChapter.id), title: chapter.prevChapter.title }
    : null;
  const next = chapter.nextChapter
    ? { href: chapterUrl(chapter.nextChapter.id), title: chapter.nextChapter.title }
    : null;
  const comments = resolveCommentable(chapter.commentable, 'bookChapters')
    ? {
        slug: `${assetPrefix}books/${book.slug}/${chapter.slug}`,
        postUrl: `${siteConfig.baseUrl.replace(/\/+$/, '')}${chapterUrl(chapter.slug)}`,
      }
    : null;

  return (
    <BookReadingShell
      book={{
        slug: book.slug,
        title: book.title,
        toc: book.toc,
        chapters: book.chapters,
        showChapterExcerpt: book.showChapterExcerpt,
      }}
      chapter={{
        slug: chapter.slug,
        title: chapter.title,
        wordCount: chapter.wordCount,
        readingMinutes: chapter.readingMinutes,
        excerpt: chapter.excerpt,
        headings: chapter.headings,
      }}
      prev={prev}
      next={next}
      comments={comments}
      breadcrumbs={<Breadcrumbs items={breadcrumbs} locale={book.locale} className="mb-6" />}
    >
      <MarkdownRenderer
        content={chapter.content}
        locale={book.locale}
        latex={chapter.latex}
        slug={imageSlug}
        bookContext={{
          bookSlug: book.slug,
          bookDir,
          chapterSourcePath: chapter.sourcePath,
          validChapterIds,
          locale: book.locale,
        }}
      />
    </BookReadingShell>
  );
}
