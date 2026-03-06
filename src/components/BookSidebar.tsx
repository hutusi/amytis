'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookTocItem, BookChapterEntry, Heading } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';
import { useSidebarAutoScroll } from '@/hooks/useSidebarAutoScroll';
import InlineBookToc from './InlineBookToc';

interface BookSidebarProps {
  bookSlug: string;
  bookTitle: string;
  toc: BookTocItem[];
  chapters: BookChapterEntry[];
  currentChapter: string;
  headings?: Heading[];
}

export default function BookSidebar({ bookSlug, bookTitle, toc, chapters, currentChapter, headings = [] }: BookSidebarProps) {
  const { t } = useLanguage();
  const currentIndex = chapters.findIndex(ch => ch.id === currentChapter);
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Track which parts are collapsed
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of toc) {
      if ('part' in item) {
        const containsCurrent = item.chapters.some(ch => ch.id === currentChapter);
        initial[item.part] = !containsCurrent;
      }
    }
    return initial;
  });

  const togglePart = (part: string) => {
    setCollapsedParts(prev => ({ ...prev, [part]: !prev[part] }));
  };

  // Re-run auto-scroll when the chapter changes AND when its part becomes visible.
  // Without the visibility check, navigating into a collapsed part would trigger
  // the expansion effect but the chapter DOM element wouldn't exist yet, so scroll
  // would silently do nothing.
  const isCurrentChapterVisible = toc.some(item =>
    'part' in item
      ? !collapsedParts[item.part] && item.chapters.some(ch => ch.id === currentChapter)
      : item.id === currentChapter
  );
  useSidebarAutoScroll(sidebarRef, currentItemRef, `${currentChapter}:${isCurrentChapterVisible}`);

  // Expand part containing current chapter when it changes
  useEffect(() => {
    for (const item of toc) {
      if ('part' in item && item.chapters.some(ch => ch.id === currentChapter)) {
        setCollapsedParts(prev => ({ ...prev, [item.part]: false }));
      }
    }
  }, [currentChapter, toc]);


  // Pre-calculate chapter global indices to avoid reassignment during render
  const chapterIndices = new Map<string, number>();
  let currentGlobalIdx = 0;
  toc.forEach((item) => {
    if ('part' in item) {
      item.chapters.forEach(ch => {
        chapterIndices.set(ch.id, currentGlobalIdx++);
      });
    } else {
      chapterIndices.set(item.id, currentGlobalIdx++);
    }
  });

  // Helper to render a chapter link + inline headings if current
  const renderChapterItem = (ch: { title: string; id: string }) => {
    const isCurrent = ch.id === currentChapter;
    const idx = chapterIndices.get(ch.id) ?? 0;
    const isPast = idx < currentIndex;

    return (
      <li key={ch.id} ref={isCurrent ? currentItemRef : undefined}>
        <Link
          href={`/books/${bookSlug}/${ch.id}`}
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
        {isCurrent && <InlineBookToc headings={headings} />}
      </li>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin"
    >
      {/* Book Header */}
      <div className="mb-6 pb-4 border-b border-muted/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent">
            {t('book')}
          </span>
          <span className="text-xs font-mono text-muted whitespace-nowrap">
            {currentIndex + 1}/{chapters.length}
          </span>
        </div>
        <Link href={`/books/${bookSlug}`} className="group block no-underline">
          <h3 className="font-serif font-bold text-heading text-lg leading-snug group-hover:text-accent transition-colors">
            {bookTitle}
          </h3>
        </Link>
      </div>

      {/* TOC */}
      <nav aria-label="Book navigation">
        <ul className="space-y-1">
          {toc.map((item, tocIdx) => {
            if ('part' in item) {
              const isCollapsed = collapsedParts[item.part];
              const partChapters = item.chapters;

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
                      {partChapters.map((ch) => renderChapterItem(ch))}
                    </ul>
                  )}
                </li>
              );
            } else {
              return renderChapterItem(item);
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
