import path from 'path';
import { getBookDirPath, type BookData, type BookChapterData } from '@/lib/content/books';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import BookReadingShell from '@/components/BookReadingShell';
import { getBookChapterUrl } from '@/lib/urls';
import { siteConfig } from '../../site.config';
import { resolveCommentable } from '@/lib/comments';

interface BookLayoutProps {
  book: BookData;
  chapter: BookChapterData;
}

export default function BookLayout({ book, chapter }: BookLayoutProps) {
  const bookDir = getBookDirPath(book.slug);
  const validChapterIds = new Set(book.chapters.map(c => c.id));

  // `slug` is the public-relative directory used by rehype-image-metadata to
  // resolve `![](./assets/...)`-style refs. For nested flat chapters
  // (e.g. id `maths/linear/vectors`) the image's parent dir is the chapter's
  // parent dir, not the book root — without this, all chapter images point
  // at `/books/<slug>/assets/...` instead of `/books/<slug>/<dir>/assets/...`.
  let imageSlug: string;
  if (chapter.isFolder) {
    imageSlug = `books/${book.slug}/${chapter.slug}`;
  } else {
    const parentDir = path.posix.dirname(chapter.slug);
    imageSlug = parentDir === '.' ? `books/${book.slug}` : `books/${book.slug}/${parentDir}`;
  }

  const prev = chapter.prevChapter
    ? { href: getBookChapterUrl(book.slug, chapter.prevChapter.id), title: chapter.prevChapter.title }
    : null;
  const next = chapter.nextChapter
    ? { href: getBookChapterUrl(book.slug, chapter.nextChapter.id), title: chapter.nextChapter.title }
    : null;
  const comments = resolveCommentable(chapter.commentable, 'bookChapters')
    ? {
        slug: `books/${book.slug}/${chapter.slug}`,
        postUrl: `${siteConfig.baseUrl.replace(/\/+$/, '')}${getBookChapterUrl(book.slug, chapter.slug)}`,
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
    >
      <MarkdownRenderer
        content={chapter.content}
        latex={chapter.latex}
        slug={imageSlug}
        bookContext={{
          bookSlug: book.slug,
          bookDir,
          chapterSourcePath: chapter.sourcePath,
          validChapterIds,
        }}
      />
    </BookReadingShell>
  );
}
