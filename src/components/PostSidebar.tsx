'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { PostData, Heading } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';

interface PostSidebarProps {
  seriesSlug?: string;
  seriesTitle?: string;
  posts?: PostData[];
  currentSlug: string;
  headings: Heading[];
}

function getVisibleIndices(total: number, current: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const result: (number | 'ellipsis')[] = [];
  result.push(0);
  const windowStart = Math.max(1, current - 2);
  const windowEnd = Math.min(total - 2, current + 2);
  if (windowStart > 1) result.push('ellipsis');
  for (let i = windowStart; i <= windowEnd; i++) result.push(i);
  if (windowEnd < total - 2) result.push('ellipsis');
  result.push(total - 1);
  return result;
}

export default function PostSidebar({ seriesSlug, seriesTitle, posts, currentSlug, headings }: PostSidebarProps) {
  const { t } = useLanguage();
  const hasSeries = !!(seriesSlug && posts && posts.length > 0);
  const currentIndex = hasSeries ? posts!.findIndex(p => p.slug === currentSlug) : -1;
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [tocCollapsed, setTocCollapsed] = useState(false);

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
    
    // Use requestAnimationFrame to avoid cascading render lint error on mount
    const rafId = requestAnimationFrame(handleScroll);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, headings.length]);

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

  // Auto-scroll sidebar to current series item
  useEffect(() => {
    if (currentItemRef.current && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const item = currentItemRef.current;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const sidebarHeight = sidebar.clientHeight;
      sidebar.scrollTop = itemTop - sidebarHeight / 2 + itemHeight / 2;
    }
  }, [currentSlug]);

  return (
    <aside
      ref={sidebarRef}
      className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin"
    >
      {/* Series section */}
      {hasSeries && (
        <>
          <div className="mb-6 pb-4 border-b border-muted/10">
            <Link href={`/series/${seriesSlug}`} className="group block no-underline">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-2 block">
                {t('series')}
              </span>
              <h3 className="font-serif font-bold text-heading text-lg leading-snug group-hover:text-accent transition-colors">
                {seriesTitle}
              </h3>
            </Link>

            {/* Progress */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-1 bg-muted/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/60 rounded-full transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / posts!.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted whitespace-nowrap">
                {currentIndex + 1}/{posts!.length}
              </span>
            </div>
          </div>

          {/* Series posts list */}
          <nav aria-label="Series navigation" className="mb-6">
            <ul className="space-y-1 relative">
              <div className="absolute left-[11px] top-3 bottom-3 w-px bg-muted/15" />
              {getVisibleIndices(posts!.length, currentIndex).map((item, i) => {
                if (item === 'ellipsis') {
                  return (
                    <li key={`ellipsis-${i}`} className="flex items-center py-1 pl-3">
                      <span className="text-xs font-mono text-muted/40 tracking-widest">···</span>
                    </li>
                  );
                }
                const post = posts![item];
                const isCurrent = post.slug === currentSlug;
                const isPast = item < currentIndex;

                return (
                  <li key={post.slug} ref={isCurrent ? currentItemRef : undefined} className="relative">
                    <Link
                      href={`/posts/${post.slug}`}
                      className={`group flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg no-underline transition-all duration-200 ${
                        isCurrent ? 'bg-accent/5' : 'hover:bg-muted/5'
                      }`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                        isCurrent
                          ? 'bg-accent text-white shadow-sm shadow-accent/30'
                          : isPast
                            ? 'bg-accent/20 text-accent'
                            : 'bg-muted/10 text-muted group-hover:bg-muted/20 group-hover:text-foreground'
                      }`}>
                        {String(item + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <span className={`block text-sm leading-snug transition-colors ${
                          isCurrent
                            ? 'text-accent font-semibold'
                            : isPast
                              ? 'text-foreground/70 group-hover:text-foreground'
                              : 'text-muted group-hover:text-foreground'
                        }`}>
                          {post.title}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer link */}
          <div className="mb-6 pb-4 border-b border-muted/10">
            <Link
              href={`/series/${seriesSlug}`}
              className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
            >
              {t('view_full_series')}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </>
      )}

      {/* Page TOC */}
      {headings.length > 0 && (
        <nav aria-label="Table of contents">
          <button
            onClick={() => setTocCollapsed(prev => !prev)}
            className="w-full flex items-center justify-between gap-2 mb-3"
          >
            <h2 className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
              {t('on_this_page')}
            </h2>
            <svg
              className={`w-3.5 h-3.5 text-muted flex-shrink-0 transition-transform duration-200 ${tocCollapsed ? '' : 'rotate-180'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {!tocCollapsed && (
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
        </nav>
      )}
    </aside>
  );
}
