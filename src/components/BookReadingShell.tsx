'use client';

import type { ReactNode } from 'react';
import BookSidebar from '@/components/BookSidebar';
import BookMobileNav from '@/components/BookMobileNav';
import PrevNextNav from '@/components/PrevNextNav';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import Comments from '@/components/Comments';
import { useLanguage } from '@/components/LanguageProvider';
import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';
import ImmersiveReader from '@/components/ImmersiveReader';
import ImmersiveToggleButton from '@/components/ImmersiveToggleButton';
import MetaDot from '@/components/ui/MetaDot';
import type { BookTocItem, BookChapterEntry } from '@/lib/content/books';
import type { Heading } from '@/lib/content/types';
import { getBookUrl , localizeUrl } from '@/lib/urls';

interface BookReadingShellProps {
  book: {
    slug: string;
    title: string;
    toc: BookTocItem[];
    chapters: BookChapterEntry[];
    showChapterExcerpt: boolean;
  };
  chapter: {
    slug: string;
    title: string;
    wordCount: number;
    readingMinutes: number;
    excerpt?: string;
    headings: Heading[];
  };
  prev: { href: string; title: string } | null;
  next: { href: string; title: string } | null;
  comments: { slug: string; postUrl: string } | null;
  children: ReactNode;
}

export default function BookReadingShell({
  book,
  chapter,
  prev,
  next,
  comments,
  children,
}: BookReadingShellProps) {
  const { t, language } = useLanguage();
  const { enabled } = useImmersiveReading();

  const chapterHeader = (
    <header data-pagefind-body data-pagefind-filter="type:Book" className="mb-12 pb-8 border-b border-line">
      {/* Word count / reading time / immersive button: not search content. */}
      <div data-pagefind-ignore className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-sans text-muted mb-4">
        <span className="uppercase tracking-widest font-semibold text-accent">
          {t('chapter')}
        </span>
        <MetaDot />
        <span className="font-mono">
          {chapter.wordCount.toLocaleString()} {t('words')}
        </span>
        <MetaDot />
        <span className="font-mono text-muted">
          {chapter.readingMinutes} {t('reading_time')}
        </span>
        {/* ImmersiveToggleButton hides itself when enabled — no outer wrap
            needed beyond the layout positioning. */}
        <span className="ml-auto">
          <ImmersiveToggleButton />
        </span>
      </div>

      <h1 data-pagefind-meta="title" className="text-3xl md:text-4xl font-serif font-bold text-heading leading-tight mb-4">
        {chapter.title}
      </h1>

      {book.showChapterExcerpt && chapter.excerpt && (
        <p className="text-lg text-muted font-serif italic leading-relaxed">
          {chapter.excerpt}
        </p>
      )}
    </header>
  );

  const prevNext = (
    <div className="mt-16 pt-8 border-t border-line">
      <PrevNextNav prev={prev} next={next} size="lg" />
    </div>
  );

  if (enabled) {
    return (
      <ImmersiveReader
        rootHref={localizeUrl(getBookUrl(book.slug), language)}
        rootTitle={book.title}
        currentTitle={chapter.title}
        sidebar={
          <BookSidebar
            mode="fill"
            bookSlug={book.slug}
            bookTitle={book.title}
            toc={book.toc}
            chapters={book.chapters}
            currentChapter={chapter.slug}
            headings={chapter.headings}
          />
        }
      >
        {chapterHeader}
        {children}
        {prevNext}
      </ImmersiveReader>
    );
  }

  return (
    <div className="layout-container">
      <ReadingProgressBar />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        <BookSidebar
          bookSlug={book.slug}
          bookTitle={book.title}
          toc={book.toc}
          chapters={book.chapters}
          currentChapter={chapter.slug}
          headings={chapter.headings}
        />

        <article className="min-w-0 w-full max-w-3xl mx-auto overflow-x-hidden">
          <div className="lg:hidden mb-8">
            <BookMobileNav
              bookSlug={book.slug}
              bookTitle={book.title}
              toc={book.toc}
              chapters={book.chapters}
              currentChapter={chapter.slug}
            />
          </div>

          {chapterHeader}
          <div data-pagefind-body>{children}</div>
          {comments && <Comments slug={comments.slug} postUrl={comments.postUrl} />}
          {prevNext}
        </article>
      </div>
    </div>
  );
}
