'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';
import type { FlowIndexItem } from '@/lib/flow-stream';

interface FlowIndexClientProps {
  /** Light items across ALL pages — tag filtering searches the whole archive. */
  allFlows: FlowIndexItem[];
  entryDates: string[];
  tags: Record<string, number>;
  /**
   * Server-rendered full-content card feed for the current page, including
   * its pagination. Swapped out wholesale while a tag filter is active, so
   * pagination hides automatically.
   */
  feed: ReactNode;
  /** Breadcrumb node rendered at the top of the calendar sidebar (archives). */
  breadcrumb?: ReactNode;
  /** Initial month shown by the calendar (archives). */
  currentDate?: string;
}

export default function FlowIndexClient({ allFlows, entryDates, tags, feed, breadcrumb, currentDate }: FlowIndexClientProps) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredFlows = useMemo(
    () => (selectedTag ? allFlows.filter(f => f.tags.includes(selectedTag)) : allFlows),
    [allFlows, selectedTag],
  );

  function handleTagSelect(tag: string) {
    setSelectedTag(prev => (prev === tag ? null : tag));
  }

  const hasTags = tags && Object.keys(tags).length > 0;

  return (
    <div className="flex gap-10">
      <FlowCalendarSidebar
        entryDates={entryDates}
        currentDate={currentDate}
        tags={tags}
        selectedTag={selectedTag}
        onTagSelect={handleTagSelect}
        breadcrumb={breadcrumb}
      />

      <div className="flex-1 min-w-0">
        {/* Mobile tag filter strip */}
        {hasTags && (
          <div className="lg:hidden mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {Object.entries(tags)
                .sort((a, b) => b[1] - a[1])
                .map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => handleTagSelect(tag)}
                    className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      selectedTag === tag
                        ? 'bg-accent text-white border-accent'
                        : 'border-ink/[0.08] text-muted hover:border-accent hover:text-accent'
                    }`}
                  >
                    {tag}
                    <span className={`text-[10px] ${selectedTag === tag ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {selectedTag ? (
          <>
            <div className="flex items-center gap-2 mb-4 text-sm text-muted">
              <span>
                {filteredFlows.length} / {allFlows.length}
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-ink/[0.08] text-xs hover:border-accent hover:text-accent transition-colors"
              >
                ✕ {t('clear')}
              </button>
            </div>
            {filteredFlows.length === 0 ? (
              <p className="text-muted">{t('no_flows')}</p>
            ) : (
              <div className="space-y-0">
                {filteredFlows.map(flow => (
                  <FlowTimelineEntry
                    key={flow.slug}
                    date={flow.date}
                    title={flow.title}
                    excerpt={flow.excerpt}
                    tags={flow.tags}
                    slug={flow.slug}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          feed
        )}
      </div>
    </div>
  );
}
