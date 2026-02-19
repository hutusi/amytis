'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

interface FlowCalendarSidebarProps {
  entryDates: string[];
  currentDate?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function FlowCalendarSidebar({ entryDates, currentDate }: FlowCalendarSidebarProps) {
  const { t } = useLanguage();
  const initialDate = currentDate ? new Date(currentDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [showBrowse, setShowBrowse] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const entrySet = new Set(entryDates);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <aside className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)]">
      <div className="border border-muted/20 rounded-lg p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-1 text-muted hover:text-accent transition-colors"
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="text-sm font-medium text-heading">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1 text-muted hover:text-accent transition-colors"
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;

            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEntry = entrySet.has(dateStr);
            const isToday = dateStr === todayStr;
            const isCurrent = dateStr === currentDate;

            const baseClasses = 'relative flex flex-col items-center justify-center h-8 text-xs rounded-md transition-colors';

            if (isCurrent) {
              return (
                <Link
                  key={dateStr}
                  href={`/flows/${viewYear}/${String(viewMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`}
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
                  href={`/flows/${viewYear}/${String(viewMonth + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`}
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
        <div className="mt-3 pt-3 border-t border-muted/20">
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
                              href={`/flows/${year}/${String(m).padStart(2, '0')}`}
                              className={`flex items-center justify-between text-xs no-underline px-1 py-0.5 rounded hover:bg-accent/10 ${
                                isCurrentMonth ? 'text-accent font-medium' : 'text-muted'
                              }`}
                            >
                              <span>{String(m).padStart(2, '0')}</span>
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
    </aside>
  );
}
