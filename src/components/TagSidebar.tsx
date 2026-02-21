'use client';

import Link from 'next/link';
import { useState } from 'react';
import { t, tWith } from '@/lib/i18n';
import { LuTag, LuX, LuSearch } from 'react-icons/lu';

const INITIAL_SHOW = 12;

interface TagSidebarProps {
  tags: Record<string, number>;
  activeTag: string;
}

export default function TagSidebar({ tags, activeTag }: TagSidebarProps) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(false);

  const totalCount = Object.keys(tags).length;

  const sortedTags = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .filter(([tag]) => !filter || tag.toLowerCase().includes(filter.toLowerCase()));

  const activeIndex = sortedTags.findIndex(([tag]) => tag === activeTag);

  // Compute visible tags:
  // - Filtering or expanded: show all
  // - Default: show first INITIAL_SHOW, then append active tag (with a separator)
  //   if it falls beyond the initial slice — keeps sidebar compact while
  //   always making the selected tag visible
  const getVisibleTags = (): { entries: [string, number][]; appendedAt: number | null } => {
    if (filter || expanded) return { entries: sortedTags, appendedAt: null };
    const initial = sortedTags.slice(0, INITIAL_SHOW);
    if (activeIndex >= INITIAL_SHOW) {
      return { entries: [...initial, sortedTags[activeIndex]], appendedAt: INITIAL_SHOW };
    }
    return { entries: initial, appendedAt: null };
  };

  const { entries: visibleTags, appendedAt } = getVisibleTags();
  const remainingCount = sortedTags.length - visibleTags.length;
  const showExpandButton = !filter && !expanded && remainingCount > 0;
  // Only allow collapsing if it won't hide the active tag
  const showCollapseButton = expanded && !filter && (activeIndex === -1 || activeIndex < INITIAL_SHOW);

  return (
    <aside className="hidden lg:block flex-shrink-0">
      <div className="sticky top-24">

        {/* Section heading → links to all tags, shows total count */}
        <Link
          href="/tags"
          className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline mb-3"
        >
          <LuTag className="w-3 h-3" />
          <span>{t('tags')}</span>
          <span className="ml-auto font-mono font-normal normal-case tracking-normal text-muted/50">
            {totalCount}
          </span>
        </Link>

        {/* Filter input with clear button */}
        <div className="relative mb-3">
          <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted/40 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            aria-label={t('filter_tags')}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-muted/5 border border-muted/15 rounded-lg outline-none focus:border-accent/40 text-foreground placeholder:text-muted/40 transition-colors"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted transition-colors p-0.5 rounded"
              aria-label="Clear filter"
            >
              <LuX className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tag list — no overflow, no scrollbar */}
        <nav className="space-y-0.5">
          {visibleTags.map(([tag, count], index) => {
            const isActive = tag === activeTag;
            // Thin separator before the appended active tag
            const showSeparator = appendedAt !== null && index === appendedAt;
            return (
              <div key={tag}>
                {showSeparator && <div className="my-1.5 h-px bg-muted/10" />}
                <Link
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
              </div>
            );
          })}

          {/* Expand button */}
          {showExpandButton && (
            <button
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              className="w-full text-left px-2.5 py-1.5 text-xs text-muted/50 hover:text-accent transition-colors"
            >
              {tWith('more_tags', { count: remainingCount })}
            </button>
          )}

          {/* Collapse button */}
          {showCollapseButton && (
            <button
              onClick={() => setExpanded(false)}
              aria-expanded={true}
              className="w-full text-left px-2.5 py-1.5 text-xs text-muted/50 hover:text-accent transition-colors"
            >
              {t('collapse_tags')}
            </button>
          )}

          {/* Empty state */}
          {visibleTags.length === 0 && (
            <p className="text-xs text-muted/60 italic px-2.5 py-2">{t('no_tags_found')}</p>
          )}
        </nav>

      </div>
    </aside>
  );
}
