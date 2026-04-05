'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';
import Pagination from '@/components/Pagination';

interface FlowItem {
  slug: string;
  date: string;
  title?: string;
  excerpt: string;
  tags: string[];
}

interface FlowContentProps {
  flows: FlowItem[];
  allFlows?: FlowItem[];
  entryDates: string[];
  tags: Record<string, number>;
  currentDate?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    basePath: string;
  };
  breadcrumb?: ReactNode;
}

export default function FlowContent({ flows, allFlows, entryDates, tags, currentDate, pagination, breadcrumb }: FlowContentProps) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredFlows = useMemo(() => {
    if (!selectedTag) return flows;
    const source = allFlows ?? flows;
    return source.filter(f => f.tags.includes(selectedTag));
  }, [flows, allFlows, selectedTag]);

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
                        : 'border-muted/20 text-muted hover:border-accent hover:text-accent'
                    }`}
                  >
                    {tag}
                    <span className={`text-[10px] ${selectedTag === tag ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {selectedTag && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted">
            <span>
              {filteredFlows.length} / {(allFlows ?? flows).length}
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-muted/20 text-xs hover:border-accent hover:text-accent transition-colors"
            >
              ✕ {t('clear')}
            </button>
          </div>
        )}

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

        {!selectedTag && pagination && pagination.totalPages > 1 && (
          <div className="mt-12">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              basePath={pagination.basePath}
            />
          </div>
        )}
      </div>
    </div>
  );
}
