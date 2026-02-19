'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FlowCalendarSidebarProps {
  entryDates: string[];
  currentDate?: string;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function FlowCalendarSidebar({ entryDates, currentDate }: FlowCalendarSidebarProps) {
  const initialDate = currentDate ? new Date(currentDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const entrySet = new Set(entryDates);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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
      </div>
    </aside>
  );
}
