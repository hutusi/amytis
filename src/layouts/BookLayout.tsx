import Link from 'next/link';
import { BookData, BookChapterData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import BookSidebar from '@/components/BookSidebar';
import BookMobileNav from '@/components/BookMobileNav';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import { t } from '@/lib/i18n';

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
        />

        {/* Main content */}
        <article className="min-w-0 max-w-3xl">
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
          <MarkdownRenderer content={chapter.content} latex={chapter.latex} slug={`books/${book.slug}`} />

          {/* Prev/Next navigation */}
          <nav className="mt-16 pt-8 border-t border-muted/10 flex gap-4">
            {chapter.prevChapter ? (
              <Link
                href={`/books/${book.slug}/${chapter.prevChapter.file}`}
                className="flex-1 group flex items-center gap-3 py-4 px-5 rounded-xl bg-muted/5 hover:bg-muted/10 no-underline transition-colors"
              >
                <svg className="w-5 h-5 flex-shrink-0 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <div className="min-w-0">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-1">{t('prev')}</span>
                  <span className="block text-sm font-medium text-foreground/80 group-hover:text-foreground truncate transition-colors">
                    {chapter.prevChapter.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {chapter.nextChapter ? (
              <Link
                href={`/books/${book.slug}/${chapter.nextChapter.file}`}
                className="flex-1 group flex items-center justify-end gap-3 py-4 px-5 rounded-xl bg-muted/5 hover:bg-muted/10 no-underline transition-colors text-right"
              >
                <div className="min-w-0">
                  <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-1">{t('next')}</span>
                  <span className="block text-sm font-medium text-foreground/80 group-hover:text-foreground truncate transition-colors">
                    {chapter.nextChapter.title}
                  </span>
                </div>
                <svg className="w-5 h-5 flex-shrink-0 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}
