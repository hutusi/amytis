'use client';

import type { ReactNode } from 'react';
import BookSidebar from '@/components/BookSidebar';
import BookMobileNav from '@/components/BookMobileNav';
import PrevNextNav from '@/components/PrevNextNav';
import ReadingProgressBar from '@/components/ReadingProgressBar';
import Comments from '@/components/Comments';
import { useLanguage } from '@/components/LanguageProvider';
import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';
import ImmersiveBookReader from '@/components/ImmersiveBookReader';
import ImmersiveToggleButton from '@/components/ImmersiveToggleButton';
import type { BookTocItem, BookChapterEntry, Heading } from '@/lib/markdown';

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
  const { t } = useLanguage();
  const { enabled } = useImmersiveReading();

  const chapterHeader = (
    <header className="mb-12 pb-8 border-b border-muted/10">
      <div className="flex items-center gap-3 text-xs font-sans text-muted mb-4">
        <span className="uppercase tracking-widest font-semibold text-accent">
          {t('chapter')}
        </span>
        <span className="w-1 h-1 rounded-full bg-muted/30" />
        <span className="font-mono">
          {chapter.wordCount.toLocaleString()} {t('words')}
        </span>
        <span className="w-1 h-1 rounded-full bg-muted/30" />
        <span className="font-mono text-muted/70">
          {chapter.readingMinutes} {t('reading_time')}
        </span>
        {!enabled && (
          <span className="ml-auto">
            <ImmersiveToggleButton />
          </span>
        )}
      </div>

      <h1 className="text-3xl md:text-4xl font-serif font-bold text-heading leading-tight mb-4">
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
    <div className="mt-16 pt-8 border-t border-muted/10">
      <PrevNextNav prev={prev} next={next} size="lg" />
    </div>
  );

  if (enabled) {
    return (
      <ImmersiveBookReader
        book={{
          slug: book.slug,
          title: book.title,
          toc: book.toc,
          chapters: book.chapters,
        }}
        chapter={{
          slug: chapter.slug,
          title: chapter.title,
          headings: chapter.headings,
        }}
      >
        {chapterHeader}
        {children}
        {prevNext}
      </ImmersiveBookReader>
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
          {children}
          {comments && <Comments slug={comments.slug} postUrl={comments.postUrl} />}
          {prevNext}
        </article>
      </div>
    </div>
  );
}
