'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useScrollY } from '@/hooks/useScrollY';
import type { BacklinkSource, Heading } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';

interface NoteSidebarProps {
  headings: Heading[];
  showToc: boolean;
  backlinks: BacklinkSource[];
  breadcrumb?: ReactNode;
}

export default function NoteSidebar({ headings, showToc, backlinks, breadcrumb }: NoteSidebarProps) {
  const { t } = useLanguage();
  const scrollY = useScrollY();
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [tocCollapsed, setTocCollapsed] = useState(false);

  useEffect(() => {
    if (!showToc || headings.length === 0) return;
    const elements = headings
      .map(h => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];
    if (!elements.length) return;
    const scrollPosition = scrollY + 100;
    let current = elements[0];
    for (const el of elements) {
      if (el.offsetTop <= scrollPosition) current = el;
      else break;
    }
    const rafId = requestAnimationFrame(() => { if (current) setActiveHeadingId(current.id); });
    return () => cancelAnimationFrame(rafId);
  }, [scrollY, headings, showToc]);

  const scrollToHeading = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
      history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <aside className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin">
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      {/* TOC */}
      {showToc && headings.length > 0 && (
        <nav
          aria-label="Table of contents"
          className={`mb-6 ${backlinks.length > 0 ? 'pb-6 border-b border-muted/10' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
              {t('on_this_page')}
            </span>
            <button
              onClick={() => setTocCollapsed(p => !p)}
              className="text-muted hover:text-foreground transition-colors"
              aria-label={tocCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${tocCollapsed ? '' : 'rotate-180'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {!tocCollapsed && (
            <ul className="space-y-0.5 border-l border-muted/15 animate-slide-down">
              {headings.map(h => {
                const isActive = h.id === activeHeadingId;
                return (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={e => scrollToHeading(e, h.id)}
                      className={`block py-1 text-[13px] leading-snug no-underline transition-colors duration-200 ${
                        h.level === 3 ? 'pl-6' : 'pl-3'
                      } ${
                        isActive
                          ? 'text-accent font-medium border-l-2 border-accent -ml-px'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      {h.text}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted block mb-3">
            {t('backlinks')}
          </span>
          <div className="flex flex-col gap-3">
            {backlinks.map(bl => (
              <div key={`${bl.type}-${bl.slug}`} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted/60 border border-muted/20 rounded px-1.5 py-0.5 shrink-0">
                    {bl.type}
                  </span>
                  <Link
                    href={bl.url}
                    className="text-sm text-heading hover:text-accent no-underline transition-colors truncate"
                  >
                    {bl.title}
                  </Link>
                </div>
                {bl.context && (
                  <p className="text-xs text-muted leading-relaxed line-clamp-2 pl-0.5">
                    &ldquo;{bl.context}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
