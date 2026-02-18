'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookTocItem, BookChapterEntry } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';

interface BookSidebarProps {
  bookSlug: string;
  bookTitle: string;
  toc: BookTocItem[];
  chapters: BookChapterEntry[];
  currentChapter: string;
}

export default function BookSidebar({ bookSlug, bookTitle, toc, chapters, currentChapter }: BookSidebarProps) {
  const { t } = useLanguage();
  const currentIndex = chapters.findIndex(ch => ch.file === currentChapter);
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Track which parts are collapsed
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of toc) {
      if ('part' in item) {
        // Auto-open the part containing the current chapter
        const containsCurrent = item.chapters.some(ch => ch.file === currentChapter);
        initial[item.part] = !containsCurrent;
      }
    }
    return initial;
  });

  const togglePart = (part: string) => {
    setCollapsedParts(prev => ({ ...prev, [part]: !prev[part] }));
  };

  useEffect(() => {
    if (currentItemRef.current && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const item = currentItemRef.current;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const sidebarHeight = sidebar.clientHeight;
      sidebar.scrollTop = itemTop - sidebarHeight / 2 + itemHeight / 2;
    }
  }, [currentChapter]);

  // Expand part containing current chapter when it changes
  useEffect(() => {
    for (const item of toc) {
      if ('part' in item && item.chapters.some(ch => ch.file === currentChapter)) {
        setCollapsedParts(prev => ({ ...prev, [item.part]: false }));
      }
    }
  }, [currentChapter, toc]);

  let globalIndex = 0;

  return (
    <aside
      ref={sidebarRef}
      className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin"
    >
      {/* Book Header */}
      <div className="mb-6 pb-4 border-b border-muted/10">
        <Link href={`/books/${bookSlug}`} className="group block no-underline">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-2 block">
            {t('book')}
          </span>
          <h3 className="font-serif font-bold text-heading text-lg leading-snug group-hover:text-accent transition-colors">
            {bookTitle}
          </h3>
        </Link>

        {/* Progress */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1 bg-muted/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/60 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / chapters.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted whitespace-nowrap">
            {currentIndex + 1}/{chapters.length}
          </span>
        </div>
      </div>

      {/* TOC */}
      <nav aria-label="Book navigation">
        <ul className="space-y-1">
          {toc.map((item, tocIdx) => {
            if ('part' in item) {
              const isCollapsed = collapsedParts[item.part];
              const partChapters = item.chapters;
              const startIndex = globalIndex;
              globalIndex += partChapters.length;

              return (
                <li key={`part-${tocIdx}`}>
                  <button
                    onClick={() => togglePart(item.part)}
                    className="w-full flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg text-left hover:bg-muted/5 transition-colors group"
                  >
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted group-hover:text-foreground transition-colors">
                      {item.part}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-muted flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {!isCollapsed && (
                    <ul className="space-y-0.5 mt-1 mb-3 animate-slide-down">
                      {partChapters.map((ch, chIdx) => {
                        const idx = startIndex + chIdx;
                        const isCurrent = ch.file === currentChapter;
                        const isPast = idx < currentIndex;

                        return (
                          <li key={ch.file} ref={isCurrent ? currentItemRef : undefined}>
                            <Link
                              href={`/books/${bookSlug}/${ch.file}`}
                              className={`block py-2 px-3 rounded-lg text-sm no-underline transition-all duration-200 ${
                                isCurrent
                                  ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
                                  : isPast
                                    ? 'text-foreground/70 hover:text-foreground hover:bg-muted/5'
                                    : 'text-muted hover:text-foreground hover:bg-muted/5'
                              }`}
                              aria-current={isCurrent ? 'page' : undefined}
                            >
                              {ch.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            } else {
              // Standalone chapter (no part)
              const idx = globalIndex;
              globalIndex += 1;
              const isCurrent = item.file === currentChapter;
              const isPast = idx < currentIndex;

              return (
                <li key={item.file} ref={isCurrent ? currentItemRef : undefined}>
                  <Link
                    href={`/books/${bookSlug}/${item.file}`}
                    className={`block py-2 px-3 rounded-lg text-sm no-underline transition-all duration-200 ${
                      isCurrent
                        ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
                        : isPast
                          ? 'text-foreground/70 hover:text-foreground hover:bg-muted/5'
                          : 'text-muted hover:text-foreground hover:bg-muted/5'
                    }`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            }
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-muted/10">
        <Link
          href={`/books/${bookSlug}`}
          className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
        >
          {t('all_books')}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
