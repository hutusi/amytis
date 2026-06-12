'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import ImmersiveReaderTopBar from '@/components/ImmersiveReaderTopBar';
import {
  useImmersiveReading,
  type ReadingColumnWidth,
  type ReadingFontSize,
} from '@/components/ImmersiveReadingProvider';

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

interface ImmersiveReaderProps {
  /** Breadcrumb root link — book detail page for books, series index for series. */
  rootHref: string;
  /** Left side of the top-bar breadcrumb (book title or series title). */
  rootTitle: string;
  /** Right side of the breadcrumb (chapter or post title). */
  currentTitle: string;
  /** Pre-rendered sidebar element. Caller passes `<BookSidebar mode="fill" ...>`
   *  or `<SeriesList mode="fill" ...>` so the overlay stays content-type-agnostic. */
  sidebar: ReactNode;
  children: ReactNode;
}

export default function ImmersiveReader({
  rootHref,
  rootTitle,
  currentTitle,
  sidebar,
  children,
}: ImmersiveReaderProps) {
  const { fontSize, readingTheme, columnWidth, sidebarOpen } = useImmersiveReading();

  const mainRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let rafId = 0;
    const compute = () => {
      const scrollable = main.scrollHeight - main.clientHeight;
      const pct =
        scrollable > 0
          ? Math.min(100, Math.max(0, (main.scrollTop / scrollable) * 100))
          : 0;
      setProgress(pct);
    };
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(compute);
    };
    compute();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      main.removeEventListener('scroll', onScroll);
    };
  }, []);

  const overlayStyle: CSSProperties = {
    ['--reading-font-size' as keyof CSSProperties]: FONT_SIZE_REM[fontSize],
  } as CSSProperties;

  return (
    <div
      data-reader-overlay
      data-reading-theme={readingTheme}
      style={overlayStyle}
      // `dark` is added when readingTheme === 'dark' so Tailwind's `dark:`
      // variants (notably `dark:prose-invert` in MarkdownRenderer) activate
      // inside the overlay even when the site itself is in light mode.
      className={`fixed inset-0 z-40 flex flex-col bg-background text-foreground ${
        readingTheme === 'dark' ? 'dark' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={rootTitle}
    >
      <ImmersiveReaderTopBar
        rootHref={rootHref}
        rootTitle={rootTitle}
        currentTitle={currentTitle}
      />

      {progress > 0 && (
        <div className="h-0.5 w-full bg-ink/[0.05] shrink-0">
          <div
            className="h-full bg-accent/70 transition-[width] duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {sidebarOpen && (
          <aside className="w-[280px] shrink-0 border-r border-ink/[0.06] bg-background/60">
            {sidebar}
          </aside>
        )}

        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto">
          <article className={`${COLUMN_WIDTH_CLASS[columnWidth]} mx-auto ${COLUMN_PADDING_CLASS[columnWidth]} py-10`}>
            {children}
          </article>
        </main>
      </div>
    </div>
  );
}
