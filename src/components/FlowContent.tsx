'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import FlowSidebarSlideOver from '@/components/FlowSidebarSlideOver';
import FlowStreamEntry from '@/components/FlowStreamEntry';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';
import Pagination from '@/components/Pagination';

interface StreamFlowItem {
  slug: string;
  date: string;
  title?: string;
  tags: string[];
  body: ReactNode;
}

interface CompactFlowItem {
  slug: string;
  date: string;
  title?: string;
  excerpt: string;
  tags: string[];
}

interface FlowContentProps {
  flows: StreamFlowItem[];
  allFlows?: CompactFlowItem[];
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
  const { t, language } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredCompactFlows = useMemo(() => {
    if (!selectedTag) return [];
    const source = allFlows ?? flows.map(f => ({ slug: f.slug, date: f.date, title: f.title, excerpt: '', tags: f.tags }));
    return source.filter(f => f.tags.includes(selectedTag));
  }, [flows, allFlows, selectedTag]);

  const groupedStream = useMemo(() => {
    const map = new Map<string, StreamFlowItem[]>();
    for (const f of flows) {
      const key = f.date.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return Array.from(map.entries());
  }, [flows]);

  function handleTagSelect(tag: string) {
    setSelectedTag(prev => (prev === tag ? null : tag));
  }

  const hasTags = tags && Object.keys(tags).length > 0;
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const compactTotal = (allFlows ?? flows).length;

  return (
    <div className="relative">
      <div className="mx-auto max-w-2xl min-w-0">
        {breadcrumb && <div className="mb-6">{breadcrumb}</div>}

        {/* Mobile tag strip */}
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
            <span>{filteredCompactFlows.length} / {compactTotal}</span>
            <button
              onClick={() => setSelectedTag(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-muted/20 text-xs hover:border-accent hover:text-accent transition-colors"
            >
              ✕ {t('clear')}
            </button>
          </div>
        )}

        {selectedTag ? (
          // Tag-filtered: compact list across all pages (no full body available)
          filteredCompactFlows.length === 0 ? (
            <p className="text-muted">{t('no_flows')}</p>
          ) : (
            <div>
              {filteredCompactFlows.map(flow => (
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
          )
        ) : flows.length === 0 ? (
          <p className="text-muted">{t('no_flows')}</p>
        ) : (
          // Stream mode: full content, grouped by month
          groupedStream.map(([monthKey, monthFlows]) => {
            const [y, m] = monthKey.split('-').map(Number);
            const monthLabel = new Date(y, m - 1).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
            });
            return (
              <section key={monthKey}>
                <div className="flex items-center gap-4 mt-12 mb-2 text-[11px] uppercase tracking-[0.25em] text-muted/60 first:mt-0">
                  <span className="flex-1 h-px bg-muted/15" />
                  <span>{monthLabel}</span>
                  <span className="flex-1 h-px bg-muted/15" />
                </div>
                {monthFlows.map(flow => (
                  <FlowStreamEntry
                    key={flow.slug}
                    date={flow.date}
                    slug={flow.slug}
                    title={flow.title}
                    body={flow.body}
                    tags={flow.tags}
                  />
                ))}
              </section>
            );
          })
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

      <FlowSidebarSlideOver
        entryDates={entryDates}
        currentDate={currentDate}
        tags={tags}
        selectedTag={selectedTag}
        onTagSelect={handleTagSelect}
      />
    </div>
  );
}
