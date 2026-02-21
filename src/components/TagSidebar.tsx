'use client';

import Link from 'next/link';
import { useState } from 'react';
import { t } from '@/lib/i18n';

interface TagSidebarProps {
  tags: Record<string, number>;
  activeTag: string;
}

export default function TagSidebar({ tags, activeTag }: TagSidebarProps) {
  const [filter, setFilter] = useState('');

  const sortedTags = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .filter(([tag]) => !filter || tag.toLowerCase().includes(filter.toLowerCase()));

  return (
    <aside className="hidden lg:block flex-shrink-0">
      <div className="sticky top-24">
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-3">
          {t('tags')}
        </p>

        <div className="relative mb-2">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/5 border border-muted/15 rounded-lg outline-none focus:border-accent/40 text-foreground placeholder:text-muted/40 transition-colors"
          />
        </div>

        <nav className="space-y-0.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
          {sortedTags.map(([tag, count]) => {
            const isActive = tag === activeTag;
            return (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-foreground/70 hover:text-foreground hover:bg-muted/10'
                }`}
              >
                <span className="truncate">{tag}</span>
                <span className={`ml-2 text-xs font-mono flex-shrink-0 ${isActive ? 'text-accent/70' : 'text-muted/50'}`}>
                  {count}
                </span>
              </Link>
            );
          })}
          {sortedTags.length === 0 && (
            <p className="text-xs text-muted/60 italic px-2.5 py-2">No tags found</p>
          )}
        </nav>
      </div>
    </aside>
  );
}
