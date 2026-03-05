'use client';

import { useState } from 'react';
import type { Heading } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';
import { useActiveHeading } from '@/hooks/useActiveHeading';
import { scrollToHeading } from '@/lib/scroll-utils';

interface TocPanelProps {
  headings: Heading[];
  className?: string;
}

export default function TocPanel({ headings, className = '' }: TocPanelProps) {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const activeHeadingId = useActiveHeading(headings);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className={className}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted">
          {t('on_this_page')}
        </span>
        <button
          onClick={() => setCollapsed(prev => !prev)}
          className="text-muted hover:text-foreground transition-colors"
          aria-label={collapsed ? 'Expand table of contents' : 'Collapse table of contents'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {!collapsed && (
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
  );
}
