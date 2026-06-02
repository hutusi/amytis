'use client';

import type { CSSProperties, ReactNode } from 'react';
import BookSidebar from '@/components/BookSidebar';
import ImmersiveReaderTopBar from '@/components/ImmersiveReaderTopBar';
import {
  useImmersiveReading,
  type ReadingColumnWidth,
  type ReadingFontSize,
} from '@/components/ImmersiveReadingProvider';
import type { BookTocItem, BookChapterEntry, Heading } from '@/lib/markdown';

const FONT_SIZE_REM: Record<ReadingFontSize, string> = {
  s: '1rem',
  m: '1.125rem',
  l: '1.25rem',
  xl: '1.5rem',
};

const COLUMN_WIDTH_CLASS: Record<ReadingColumnWidth, string> = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-4xl',
  full: 'max-w-none',
};

const COLUMN_PADDING_CLASS: Record<ReadingColumnWidth, string> = {
  narrow: 'px-6 sm:px-8',
  medium: 'px-6 sm:px-8',
  wide: 'px-6 sm:px-8',
  full: 'px-6 sm:px-10',
};

interface ImmersiveBookReaderProps {
  book: {
    slug: string;
    title: string;
    toc: BookTocItem[];
    chapters: BookChapterEntry[];
  };
  chapter: {
    slug: string;
    title: string;
    headings: Heading[];
  };
  children: ReactNode;
}

export default function ImmersiveBookReader({ book, chapter, children }: ImmersiveBookReaderProps) {
  const { fontSize, readingTheme, columnWidth, sidebarOpen } = useImmersiveReading();

  const overlayStyle: CSSProperties = {
    ['--reading-font-size' as keyof CSSProperties]: FONT_SIZE_REM[fontSize],
  } as CSSProperties;

  return (
    <div
      data-reader-overlay
      data-reading-theme={readingTheme}
      style={overlayStyle}
      className="fixed inset-0 z-40 flex flex-col bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={book.title}
    >
      <ImmersiveReaderTopBar
        bookSlug={book.slug}
        bookTitle={book.title}
        chapterTitle={chapter.title}
      />

      <div className="flex-1 min-h-0 flex">
        {sidebarOpen && (
          <aside className="w-[280px] shrink-0 border-r border-muted/15 bg-background/60">
            <BookSidebar
              mode="fill"
              bookSlug={book.slug}
              bookTitle={book.title}
              toc={book.toc}
              chapters={book.chapters}
              currentChapter={chapter.slug}
              headings={chapter.headings}
            />
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">
          <article className={`${COLUMN_WIDTH_CLASS[columnWidth]} mx-auto ${COLUMN_PADDING_CLASS[columnWidth]} py-10`}>
            {children}
          </article>
        </main>
      </div>
    </div>
  );
}
