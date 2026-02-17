'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heading } from '@/lib/markdown';
import { useLanguage } from '@/components/LanguageProvider';

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string>('');
  const [readProgress, setReadProgress] = useState(0);

  // Track scroll position and active heading
  const handleScroll = useCallback(() => {
    // Calculate read progress
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    setReadProgress(Math.min(100, Math.max(0, progress)));

    // Find active heading
    const headingElements = headings
      .map(h => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    // Find the heading that's currently in view
    const scrollPosition = scrollTop + 100; // Offset for navbar

    let currentHeading = headingElements[0];
    for (const heading of headingElements) {
      if (heading.offsetTop <= scrollPosition) {
        currentHeading = heading;
      } else {
        break;
      }
    }

    if (currentHeading) {
      setActiveId(currentHeading.id);
    }
  }, [headings]);

  useEffect(() => {
    handleScroll(); // Initial check
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Smooth scroll to heading
  const scrollToHeading = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
      // Update URL without scrolling
      history.pushState(null, '', `#${id}`);
    }
  };

  if (headings.length === 0) return null;

  // Find active index for progress calculation
  const activeIndex = headings.findIndex(h => h.id === activeId);

  return (
    <nav
      className="hidden lg:block sticky top-28 self-start w-56 pl-6 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide"
      aria-label="Table of contents"
    >
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-muted/10">
        <h2 className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
          {t('on_this_page')}
        </h2>
        <span className="text-[10px] font-mono text-muted/60">
          {Math.round(readProgress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-muted/10 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-accent/50 rounded-full transition-all duration-150"
          style={{ width: `${readProgress}%` }}
        />
      </div>

      {/* Headings list */}
      <ul className="space-y-1 relative">
        {/* Active indicator line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-muted/10" />

        {headings.map((heading, index) => {
          const isActive = heading.id === activeId;
          const isPast = activeIndex > -1 && index < activeIndex;
          const isH3 = heading.level === 3;

          return (
            <li
              key={heading.id}
              className={`relative ${isH3 ? 'pl-4' : ''}`}
            >
              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute left-0 w-0.5 bg-accent rounded-full transition-all duration-200"
                  style={{
                    top: '4px',
                    height: 'calc(100% - 8px)'
                  }}
                />
              )}

              <a
                href={`#${heading.id}`}
                onClick={(e) => scrollToHeading(e, heading.id)}
                className={`block py-1.5 pl-4 text-sm leading-snug transition-all duration-200 ${
                  isActive
                    ? 'text-accent font-medium'
                    : isPast
                      ? 'text-foreground/60 hover:text-foreground'
                      : 'text-muted/70 hover:text-foreground'
                }`}
                aria-current={isActive ? 'location' : undefined}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>

      {/* Back to top */}
      {readProgress > 20 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-6 pt-4 border-t border-muted/10 w-full text-left text-xs text-muted hover:text-accent transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {t('back_to_top')}
        </button>
      )}
    </nav>
  );
}
