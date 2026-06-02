'use client';

import { useMemo, useState, useRef, type ReactNode } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
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
  const initialPage = pagination?.currentPage ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const basePath = pagination?.basePath ?? '/flows';
  const [extraChunks, setExtraChunks] = useState<string[]>([]);
  const [nextPage, setNextPage] = useState(initialPage + 1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const seenMonthsRef = useRef<Set<string>>(new Set(flows.map(f => f.date.slice(0, 7))));

  async function loadMore() {
    if (loadingMore || nextPage > totalPages) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const res = await fetch(`${basePath}/page/${nextPage}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const section = doc.querySelector('#flow-stream-entries');
      if (!section) throw new Error('Stream section not found');
      // Drop month dividers we've already shown to avoid duplicates between chunks
      section.querySelectorAll('[data-month]').forEach(node => {
        const month = node.getAttribute('data-month');
        if (month && seenMonthsRef.current.has(month)) {
          node.remove();
        } else if (month) {
          seenMonthsRef.current.add(month);
        }
      });
      setExtraChunks(prev => [...prev, section.innerHTML]);
      setNextPage(prev => prev + 1);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoadingMore(false);
    }
  }

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
    <div className="lg:flex lg:gap-10">
      <FlowCalendarSidebar
        entryDates={entryDates}
        currentDate={currentDate}
        tags={tags}
        selectedTag={selectedTag}
        onTagSelect={handleTagSelect}
        variant="sidebar"
      />

      <div className="flex-1 min-w-0">
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
          <div id="flow-stream-entries">
            {groupedStream.map(([monthKey, monthFlows]) => {
              const [y, m] = monthKey.split('-').map(Number);
              const monthLabel = new Date(y, m - 1).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
              });
              return (
                <section key={monthKey}>
                  <div
                    data-month={monthKey}
                    className="flex items-center gap-4 mt-12 mb-2 text-[11px] uppercase tracking-[0.25em] text-muted/60 first:mt-0"
                  >
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
            })}
          </div>
        )}

        {/* Appended chunks fetched via "Load more". Static HTML — no React rehydration. */}
        {extraChunks.map((html, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}

        {!selectedTag && totalPages > 1 && (
          <div className="mt-16 flex flex-col items-center gap-3">
            {nextPage <= totalPages ? (
              <>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm text-muted border border-muted/20 rounded-full hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? t('loading_more') : t('load_more')}
                </button>
                {loadError && (
                  <p className="text-xs text-red-500">{loadError}</p>
                )}
              </>
            ) : (
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted/60">
                {t('end_of_stream')}
              </p>
            )}
            <noscript>
              <Pagination
                currentPage={initialPage}
                totalPages={totalPages}
                basePath={basePath}
              />
            </noscript>
          </div>
        )}
        </div>
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
