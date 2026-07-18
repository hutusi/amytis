'use client';

import { useState, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { padNumber } from '@/lib/format-utils';
import { flowStreamLocaleTag } from '@/lib/flow-stream';

interface FlowCalendarSidebarProps {
  entryDates: string[];
  currentDate?: string;
  tags?: Record<string, number>;
  selectedTag?: string | null;
  onTagSelect?: (tag: string) => void;
  breadcrumb?: ReactNode;
}

// "Today" can't be known at build time, so it's read as an external store:
// null on the server/hydration pass, the viewer's local date after (the ring
// appears post-hydration instead of mismatching). Local date parts, not
// toISOString() — that was UTC and rang the wrong day for off-UTC viewers.
function subscribeNever() {
  return () => {};
}
function getLocalTodayStr(): string | null {
  const now = new Date();
  return `${now.getFullYear()}-${padNumber(now.getMonth() + 1)}-${padNumber(now.getDate())}`;
}
function getServerTodayStr(): string | null {
  return null;
}

export default function FlowCalendarSidebar({ entryDates, currentDate, tags, selectedTag, onTagSelect, breadcrumb }: FlowCalendarSidebarProps) {
  const { t, language } = useLanguage();
  const todayStr = useSyncExternalStore(subscribeNever, getLocalTodayStr, getServerTodayStr);

  // Locale-aware weekday and short-month labels, derived from the active
  // language via Intl so they follow the language switch (no hardcoded English).
  const localeTag = flowStreamLocaleTag(language);
  const { weekdays, shortMonths } = useMemo(() => {
    const weekdayFmt = new Intl.DateTimeFormat(localeTag, { weekday: 'short' });
    const monthFmt = new Intl.DateTimeFormat(localeTag, { month: 'short' });
    return {
      // 2023-01-01 was a Sunday, matching the getDay()-based column order.
      weekdays: Array.from({ length: 7 }, (_, i) => weekdayFmt.format(new Date(2023, 0, 1 + i))),
      shortMonths: Array.from({ length: 12 }, (_, m) => monthFmt.format(new Date(2023, m, 1))),
    };
  }, [localeTag]);

  // Initial month must be derived from content (currentDate, else the latest
  // entry) so server HTML and client hydration agree — `new Date()` here
  // baked the build-time month into the prerender and mismatched once the
  // viewer's month drifted from it. Only a site with no flows at all falls
  // through to the viewer's month, which is null during SSR (empty grid,
  // nothing to mismatch).
  const latestEntry = entryDates.length > 0 ? entryDates.reduce((a, b) => (a > b ? a : b)) : null;
  const monthSource = currentDate ?? latestEntry;
  const [view, setView] = useState<{ year: number; month: number } | null>(() => {
    if (!monthSource) return null;
    const d = new Date(monthSource + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const effectiveView = view
    ?? (todayStr ? { year: Number(todayStr.slice(0, 4)), month: Number(todayStr.slice(5, 7)) - 1 } : null);
  const [showBrowse, setShowBrowse] = useState(false);

  const entrySet = useMemo(() => new Set(entryDates), [entryDates]);

  const { year: viewYear, month: viewMonth } = effectiveView ?? { year: 0, month: 0 };
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  // daysInMonth 0 while the view is unresolved → empty day grid.
  const daysInMonth = effectiveView ? new Date(viewYear, viewMonth + 1, 0).getDate() : 0;

  const monthLabel = effectiveView
    ? new Date(viewYear, viewMonth).toLocaleDateString(localeTag, {
        month: 'long',
        year: 'numeric',
      })
    : '';

  // Build year/month tree from entryDates for browse panel
  const yearMonthTree = useMemo(() => {
    const tree: Record<number, Record<number, number>> = {};
    for (const dateStr of entryDates) {
      const [y, m] = dateStr.split('-').map(Number);
      if (!tree[y]) tree[y] = {};
      tree[y][m] = (tree[y][m] || 0) + 1;
    }
    return tree;
  }, [entryDates]);

  const sortedYears = useMemo(
    () => Object.keys(yearMonthTree).map(Number).sort((a, b) => b - a),
    [yearMonthTree]
  );

  function prevMonth() {
    if (!effectiveView) return;
    setView(effectiveView.month === 0
      ? { year: effectiveView.year - 1, month: 11 }
      : { year: effectiveView.year, month: effectiveView.month - 1 });
  }

  function nextMonth() {
    if (!effectiveView) return;
    setView(effectiveView.month === 11
      ? { year: effectiveView.year + 1, month: 0 }
      : { year: effectiveView.year, month: effectiveView.month + 1 });
  }

  const days = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDay, daysInMonth]);

  return (
    <aside className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] select-none">
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      <div className="border border-line bg-surface-faint rounded-lg p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-1 text-muted hover:text-accent transition-colors"
            aria-label={t('prev_month')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-sm font-medium text-heading">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1 text-muted hover:text-accent transition-colors"
            aria-label={t('next_month')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {weekdays.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;

            const dateStr = `${viewYear}-${padNumber(viewMonth + 1)}-${padNumber(day)}`;
            const hasEntry = entrySet.has(dateStr);
            const isToday = dateStr === todayStr;
            const isCurrent = dateStr === currentDate;

            const baseClasses = 'relative flex flex-col items-center justify-center h-8 text-xs rounded-md transition-colors';

            if (isCurrent) {
              return (
                <Link
                  key={dateStr}
                  href={`/flows/${viewYear}/${padNumber(viewMonth + 1)}/${padNumber(day)}`}
                  className={`${baseClasses} bg-accent text-white font-bold no-underline`}
                >
                  {day}
                </Link>
              );
            }

            if (hasEntry) {
              return (
                <Link
                  key={dateStr}
                  href={`/flows/${viewYear}/${padNumber(viewMonth + 1)}/${padNumber(day)}`}
                  className={`${baseClasses} text-foreground hover:bg-accent/10 font-medium no-underline ${isToday ? 'ring-1 ring-accent' : ''}`}
                >
                  {day}
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
                </Link>
              );
            }

            return (
              <div
                key={dateStr}
                className={`${baseClasses} text-muted/50 ${isToday ? 'ring-1 ring-accent' : ''}`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Browse toggle */}
        <div className="mt-3 pt-3 border-t border-line">
          <button
            onClick={() => setShowBrowse(!showBrowse)}
            className="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors w-full"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showBrowse ? 'rotate-90' : ''}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            {t('browse')}
          </button>

          {showBrowse && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {sortedYears.map(year => {
                const months = yearMonthTree[year];
                const yearTotal = Object.values(months).reduce((a, b) => a + b, 0);
                const isCurrentYear = year === viewYear;

                return (
                  <div key={year}>
                    <Link
                      href={`/flows/${year}`}
                      className={`flex items-center justify-between text-xs no-underline px-1 py-0.5 rounded hover:bg-accent/10 ${
                        isCurrentYear ? 'text-accent font-medium' : 'text-foreground'
                      }`}
                    >
                      <span>{year}</span>
                      <span className="text-muted text-[10px]">{yearTotal}</span>
                    </Link>
                    <div className="ml-3 mt-0.5 space-y-0.5">
                      {Object.keys(months)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map(m => {
                          const isCurrentMonth = isCurrentYear && m - 1 === viewMonth;
                          return (
                            <Link
                              key={m}
                              href={`/flows/${year}/${padNumber(m)}`}
                              className={`flex items-center justify-between text-xs no-underline px-1 py-0.5 rounded hover:bg-accent/10 ${
                                isCurrentMonth ? 'text-accent font-medium' : 'text-muted'
                              }`}
                            >
                              <span>{shortMonths[m - 1]}</span>
                              <span className="text-[10px]">{months[m]}</span>
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Tags */}
      {tags && Object.keys(tags).length > 0 && (
        <div className="mt-3 border border-line bg-surface-faint rounded-lg p-4">
          <div className="text-xs font-medium text-muted mb-2">{t('tags')}</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tags)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => onTagSelect?.(tag)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    selectedTag === tag
                      ? 'bg-accent text-white border-accent'
                      : 'border-line-strong text-muted hover:border-accent hover:text-accent'
                  }`}
                >
                  {tag}
                  <span className={`text-[10px] ${selectedTag === tag ? 'opacity-80' : 'opacity-60'}`}>{count}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </aside>
  );
}
