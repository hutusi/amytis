'use client';

import { useLanguage } from './LanguageProvider';

interface FlowDateHeaderProps {
  date: string;     // YYYY-MM-DD
  /** Visual size — 'md' for in-stream entries, 'lg' for the day permalink page */
  size?: 'md' | 'lg';
  /** Apply hover transition when ancestor `.group` is hovered (used on the stream permalink) */
  hoverable?: boolean;
  /** Tag this <time> as the page's canonical date for Pagefind indexing */
  pagefindIndex?: boolean;
}

export default function FlowDateHeader({ date, size = 'md', hoverable = false, pagefindIndex = false }: FlowDateHeaderProps) {
  const { language } = useLanguage();
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const d = new Date(`${date}T00:00:00`);
  const sizeClass = size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl';
  const hoverClass = hoverable ? 'group-hover:text-accent transition-colors' : '';

  return (
    <>
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted/60">
        {d.toLocaleDateString(locale, { weekday: 'long' })}
      </div>
      <time
        dateTime={date}
        className={`mt-1 inline-block font-serif ${sizeClass} text-heading ${hoverClass}`.trim()}
        {...(pagefindIndex ? { 'data-pagefind-meta': 'date[content]' } : {})}
      >
        {d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
      </time>
    </>
  );
}
