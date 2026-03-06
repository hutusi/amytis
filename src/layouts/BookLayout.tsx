import { BookData, BookChapterData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import BookSidebar from '@/components/BookSidebar';
import BookMobileNav from '@/components/BookMobileNav';
import PrevNextNav from '@/components/PrevNextNav';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import { t } from '@/lib/i18n';
import { getBookChapterUrl } from '@/lib/urls';

interface BookLayoutProps {
  book: BookData;
  chapter: BookChapterData;
}

export default function BookLayout({ book, chapter }: BookLayoutProps) {
  return (
    <div className="layout-container lg:max-w-7xl">
      <ReadingProgressBar />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        {/* Left: Sidebar */}
        <BookSidebar
          bookSlug={book.slug}
          bookTitle={book.title}
          toc={book.toc}
          chapters={book.chapters}
          currentChapter={chapter.slug}
          headings={chapter.headings}
        />

        {/* Main content */}
        <article className="min-w-0 w-full max-w-3xl overflow-x-hidden">
          {/* Mobile nav */}
          <div className="lg:hidden mb-8">
            <BookMobileNav
              bookSlug={book.slug}
              bookTitle={book.title}
              toc={book.toc}
              chapters={book.chapters}
              currentChapter={chapter.slug}
            />
          </div>

          {/* Chapter header */}
          <header className="mb-12 pb-8 border-b border-muted/10">
            <div className="flex items-center gap-3 text-xs font-sans text-muted mb-4">
              <span className="uppercase tracking-widest font-semibold text-accent">
                {t('chapter')}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted/30" />
              <span className="font-mono">{chapter.readingTime}</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-serif font-bold text-heading leading-tight mb-4">
              {chapter.title}
            </h1>

            {chapter.excerpt && (
              <p className="text-lg text-muted font-serif italic leading-relaxed">
                {chapter.excerpt}
              </p>
            )}
          </header>

          {/* Content */}
          <MarkdownRenderer content={chapter.content} latex={chapter.latex} slug={chapter.isFolder ? `books/${book.slug}/${chapter.slug}` : `books/${book.slug}`} />

          {/* Prev/Next navigation */}
          <div className="mt-16 pt-8 border-t border-muted/10">
            <PrevNextNav
              prev={chapter.prevChapter ? { href: getBookChapterUrl(book.slug, chapter.prevChapter.id), title: chapter.prevChapter.title } : null}
              next={chapter.nextChapter ? { href: getBookChapterUrl(book.slug, chapter.nextChapter.id), title: chapter.nextChapter.title } : null}
              size="lg"
            />
          </div>
        </article>
      </div>
    </div>
  );
}
