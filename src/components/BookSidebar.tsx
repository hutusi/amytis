'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BookTocItem, BookChapterEntry, Heading } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';

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
  const currentIndex = chapters.findIndex(ch => ch.file === currentChapter);
  const [headingsCollapsed, setHeadingsCollapsed] = useState(false);
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // Track which parts are collapsed
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of toc) {
      if ('part' in item) {
        const containsCurrent = item.chapters.some(ch => ch.file === currentChapter);
        initial[item.part] = !containsCurrent;
      }
    }
    return initial;
  });

  const togglePart = (part: string) => {
    setCollapsedParts(prev => ({ ...prev, [part]: !prev[part] }));
  };

  // Scroll tracking for page headings
  const handleScroll = useCallback(() => {
    if (headings.length === 0) return;

    const headingElements = headings
      .map(h => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    const scrollPosition = window.scrollY + 100;
    let current = headingElements[0];
    for (const el of headingElements) {
      if (el.offsetTop <= scrollPosition) {
        current = el;
      } else {
        break;
      }
    }

    if (current) {
      setActiveHeadingId(current.id);
    }
  }, [headings]);

  useEffect(() => {
    if (headings.length === 0) return;
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, headings.length]);

  // Smooth scroll to heading
  const scrollToHeading = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      history.pushState(null, '', `#${id}`);
    }
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

  // Render the inline headings sub-list for the current chapter
  const renderHeadings = () => {
    if (headings.length === 0) return null;

    return (
      <div className="mt-1.5 mb-1 ml-3">
        <button
          onClick={() => setHeadingsCollapsed(prev => !prev)}
          className="flex items-center gap-1.5 text-[11px] font-sans font-medium uppercase tracking-wider text-muted hover:text-foreground transition-colors mb-1.5 pl-3"
        >
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${headingsCollapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          {t('on_this_page')}
        </button>
        {!headingsCollapsed && (
          <ul className="space-y-0.5 border-l border-muted/15 animate-slide-down">
            {headings.map(heading => {
              const isActive = heading.id === activeHeadingId;
              const isH3 = heading.level === 3;

              return (
                <li key={heading.id}>
                  <a
                    href={`#${heading.id}`}
                    onClick={(e) => scrollToHeading(e, heading.id)}
                    className={`block py-1 text-[13px] leading-snug no-underline transition-colors duration-200 ${
                      isH3 ? 'pl-6' : 'pl-3'
                    } ${
                      isActive
                        ? 'text-accent font-medium border-l-2 border-accent -ml-px'
                        : 'text-foreground/70 hover:text-foreground'
                    }`}
                  >
                    {heading.text}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  // Pre-calculate chapter global indices to avoid reassignment during render
  const chapterIndices = new Map<string, number>();
  let currentGlobalIdx = 0;
  toc.forEach((item) => {
    if ('part' in item) {
      item.chapters.forEach(ch => {
        chapterIndices.set(ch.file, currentGlobalIdx++);
      });
    } else {
      chapterIndices.set(item.file, currentGlobalIdx++);
    }
  });

  // Helper to render a chapter link + inline headings if current
  const renderChapterItem = (ch: { title: string; file: string }) => {
    const isCurrent = ch.file === currentChapter;
    const idx = chapterIndices.get(ch.file) ?? 0;
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
        {isCurrent && renderHeadings()}
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
