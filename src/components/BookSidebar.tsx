'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import type { BookTocItem, BookTocSection, BookChapterRef, BookChapterEntry } from '@/lib/content/books';
import type { Heading } from '@/lib/content/types';
import { useLanguage } from './LanguageProvider';
import { useSidebarAutoScroll } from '@/hooks/useSidebarAutoScroll';
import InlineBookToc from './InlineBookToc';
import MetaLabel from './ui/MetaLabel';
import { getBookChapterUrl, getBookUrl } from '@/lib/urls';

interface BookSidebarProps {
  bookSlug: string;
  bookTitle: string;
  toc: BookTocItem[];
  chapters: BookChapterEntry[];
  currentChapter: string;
  headings?: Heading[];
  /**
   * 'page' (default): the historical layout — sticky inside the chapter grid,
   * hidden below lg.
   * 'fill': for use inside a fullscreen flex container (e.g. the immersive
   * reader overlay). No sticky, visible at all breakpoints; the parent owns
   * positioning + scroll.
   */
  mode?: 'page' | 'fill';
}

// Visual indent step in pixels per nesting depth. Caps at MAX_INDENT.
const INDENT_STEP_PX = 8;
const MAX_INDENT_DEPTH = 3;

function sectionContainsChapter(section: BookTocSection, chapterId: string): boolean {
  return section.items.some(child =>
    'section' in child ? sectionContainsChapter(child, chapterId) : child.id === chapterId
  );
}

/** Collect the ancestor-path keys for every section whose subtree contains chapterId. */
function findAncestorSectionKeys(toc: BookTocItem[], chapterId: string): string[] {
  const keys: string[] = [];
  const walk = (items: Array<BookTocSection | BookChapterRef>, path: string[]) => {
    for (const item of items) {
      if (!('section' in item)) continue;
      const nextPath = [...path, item.section];
      if (sectionContainsChapter(item, chapterId)) {
        keys.push(nextPath.join('\u0000'));
      }
      walk(item.items, nextPath);
    }
  };
  for (const top of toc) {
    if ('section' in top) {
      const path = [top.section];
      if (sectionContainsChapter(top, chapterId)) keys.push(path.join('\u0000'));
      walk(top.items, path);
    }
  }
  return keys;
}

export default function BookSidebar({ bookSlug, bookTitle, toc, chapters, currentChapter, headings = [], mode = 'page' }: BookSidebarProps) {
  const { t } = useLanguage();
  const currentIndex = chapters.findIndex(ch => ch.id === currentChapter);
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Track collapsed state for legacy `part` groupings (key = part name).
  const [collapsedParts, setCollapsedParts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of toc) {
      if ('part' in item) {
        initial[item.part] = !item.chapters.some(ch => ch.id === currentChapter);
      }
    }
    return initial;
  });

  // Track collapsed state for nested sections.
  // Key = ancestor path joined with \u0000 so titles can freely contain '/'.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    const ancestors = new Set(findAncestorSectionKeys(toc, currentChapter));
    const visit = (items: Array<BookTocSection | BookChapterRef>, path: string[]) => {
      for (const item of items) {
        if (!('section' in item)) continue;
        const nextPath = [...path, item.section];
        const key = nextPath.join('\u0000');
        initial[key] = !ancestors.has(key);
        visit(item.items, nextPath);
      }
    };
    for (const top of toc) {
      if ('section' in top) {
        const path = [top.section];
        initial[path.join('\u0000')] = !ancestors.has(path.join('\u0000'));
        visit(top.items, path);
      }
    }
    return initial;
  });

  const togglePart = (part: string) => {
    setCollapsedParts(prev => ({ ...prev, [part]: !prev[part] }));
  };
  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Re-run auto-scroll when the chapter changes AND when its part/section becomes visible.
  // Without the visibility check, navigating into a collapsed group would trigger
  // the expansion effect but the chapter DOM element wouldn't exist yet, so scroll
  // would silently do nothing.
  const isCurrentChapterVisible = (() => {
    for (const item of toc) {
      if ('part' in item) {
        if (!collapsedParts[item.part] && item.chapters.some(ch => ch.id === currentChapter)) return true;
      } else if ('section' in item) {
        if (sectionContainsChapter(item, currentChapter)) {
          // Walk down — every ancestor section must be expanded for the chapter to be visible.
          const ancestorsExpanded = findAncestorSectionKeys(toc, currentChapter)
            .every(key => !collapsedSections[key]);
          if (ancestorsExpanded) return true;
        }
      } else if (item.id === currentChapter) {
        return true;
      }
    }
    return false;
  })();
  useSidebarAutoScroll(sidebarRef, currentItemRef, `${currentChapter}:${isCurrentChapterVisible}`);

  // Expand part / section ancestors containing current chapter when it changes.
  // Uses the "store info from previous renders" pattern so the state update
  // happens during render and React doesn't cascade.
  const [trackedChapter, setTrackedChapter] = useState(currentChapter);
  if (trackedChapter !== currentChapter) {
    setTrackedChapter(currentChapter);
    for (const item of toc) {
      if ('part' in item && item.chapters.some(ch => ch.id === currentChapter)) {
        setCollapsedParts(prev => ({ ...prev, [item.part]: false }));
      }
    }
    const ancestorKeys = findAncestorSectionKeys(toc, currentChapter);
    if (ancestorKeys.length > 0) {
      setCollapsedSections(prev => {
        const next = { ...prev };
        for (const k of ancestorKeys) next[k] = false;
        return next;
      });
    }
  }

  // Pre-calculate chapter global indices for "past chapters" styling.
  const chapterIndices = new Map<string, number>();
  let currentGlobalIdx = 0;
  const indexSection = (section: BookTocSection) => {
    for (const child of section.items) {
      if ('section' in child) indexSection(child);
      else chapterIndices.set(child.id, currentGlobalIdx++);
    }
  };
  toc.forEach((item) => {
    if ('part' in item) {
      item.chapters.forEach(ch => chapterIndices.set(ch.id, currentGlobalIdx++));
    } else if ('section' in item) {
      indexSection(item);
    } else {
      chapterIndices.set(item.id, currentGlobalIdx++);
    }
  });

  // Render a chapter link + inline headings if current.
  const renderChapterItem = (ch: BookChapterRef, key?: string) => {
    const isCurrent = ch.id === currentChapter;
    const idx = chapterIndices.get(ch.id) ?? 0;
    const isPast = idx < currentIndex;

    return (
      <li key={key ?? ch.id} ref={isCurrent ? currentItemRef : undefined}>
        <Link
          href={getBookChapterUrl(bookSlug, ch.id)}
          className={`block py-2 px-3 rounded-lg text-sm no-underline transition-all duration-200 ${
            isCurrent
              ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
              : isPast
                ? 'text-foreground/70 hover:text-foreground hover:bg-surface-soft'
                : 'text-muted hover:text-foreground hover:bg-surface-soft'
          }`}
          aria-current={isCurrent ? 'page' : undefined}
        >
          {ch.title}
        </Link>
        {isCurrent && <InlineBookToc headings={headings} />}
      </li>
    );
  };

  // Recursive section renderer with collapsible header.
  const renderSectionItem = (section: BookTocSection, ancestorPath: string[], depth: number): React.ReactNode => {
    const path = [...ancestorPath, section.section];
    const key = path.join('\u0000');
    // Top-level sections default expanded if they contain current; nested
    // sections honor the same state. Honor `section.collapsible === false`
    // hint from the schema by forcing expanded state.
    const isCollapsed = section.collapsible === false ? false : collapsedSections[key];
    const indent = Math.min(depth, MAX_INDENT_DEPTH) * INDENT_STEP_PX;

    return (
      <li key={key}>
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg text-left hover:bg-surface-soft transition-colors group"
          style={depth > 0 ? { paddingLeft: `${indent + 8}px` } : undefined}
          aria-expanded={!isCollapsed}
        >
          <span className={`font-sans font-bold uppercase tracking-wider text-muted group-hover:text-foreground transition-colors ${depth === 0 ? 'text-[11px]' : 'text-[10px]'}`}>
            {section.section}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-muted flex-shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {!isCollapsed && (
          <ul
            className="space-y-0.5 mt-1 mb-3 animate-slide-down"
            style={depth > 0 ? { paddingLeft: `${indent}px` } : undefined}
          >
            {section.items.map((child, idx) =>
              'section' in child
                ? renderSectionItem(child, path, depth + 1)
                : renderChapterItem(child, `${key}-${child.id}-${idx}`)
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={
        mode === 'fill'
          ? 'block w-full h-full overflow-y-auto px-4 py-6 scrollbar-hide hover:scrollbar-thin'
          : 'hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin'
      }
    >
      {/* Book Header */}
      <div className="mb-6 pb-4 border-b border-line">
        <div className="flex items-center justify-between mb-2">
          <MetaLabel tone="accent">
            {t('book')}
          </MetaLabel>
          <span className="text-xs font-mono text-muted whitespace-nowrap">
            {currentIndex + 1}/{chapters.length}
          </span>
        </div>
        <Link href={getBookUrl(bookSlug)} className="group block no-underline">
          <h3 className="font-serif font-bold text-heading text-lg leading-snug group-hover:text-accent transition-colors">
            {bookTitle}
          </h3>
        </Link>
      </div>

      {/* TOC */}
      <nav aria-label={t('book_navigation')}>
        <ul className="space-y-1">
          {toc.map((item, tocIdx) => {
            if ('section' in item) {
              return renderSectionItem(item, [], 0);
            }
            if ('part' in item) {
              const isCollapsed = collapsedParts[item.part];
              return (
                <li key={`part-${tocIdx}`}>
                  <button
                    onClick={() => togglePart(item.part)}
                    className="w-full flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg text-left hover:bg-surface-soft transition-colors group"
                    aria-expanded={!isCollapsed}
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
                      {item.chapters.map((ch) => renderChapterItem(ch))}
                    </ul>
                  )}
                </li>
              );
            }
            return renderChapterItem(item);
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-line">
        <Link
          href="/books"
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
