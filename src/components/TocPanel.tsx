'use client';

import { useState } from 'react';
import type { Heading } from '@/lib/content/types';
import { useLanguage } from './LanguageProvider';
import { useActiveHeading } from '@/hooks/useActiveHeading';
import { scrollToHeading } from '@/lib/scroll-utils';
import MetaLabel from './ui/MetaLabel';

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
    // suppressHydrationWarning on locale-bound nodes is a band-aid for the
    // known static-export + client-i18n drift: SSR renders defaultLocale,
    // `useLanguage()` hook serves the user's saved locale on hydration. The
    // real fix is per-locale URL routing, tracked as a separate refactor.
    <nav aria-label={t('on_this_page')} className={className} suppressHydrationWarning>
      <div className="flex items-center justify-between mb-3">
        <MetaLabel suppressHydrationWarning>
          {t('on_this_page')}
        </MetaLabel>
        <button
          type="button"
          onClick={() => setCollapsed(prev => !prev)}
          className="text-muted hover:text-foreground transition-colors"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('toc_expand') : t('toc_collapse')}
          suppressHydrationWarning
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
        <ul className="space-y-0.5 border-l border-ink/[0.06] animate-slide-down">
          {headings.map(h => {
            const isActive = h.id === activeHeadingId;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={e => scrollToHeading(e, h.id)}
                  className={`block py-1 text-[13px] leading-snug no-underline transition-colors duration-200 ${
                    isActive
                      ? 'text-accent font-medium border-l-2 border-accent -ml-px'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                  style={{ paddingLeft: `${(h.level - 1) * 0.75}rem` }}
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
