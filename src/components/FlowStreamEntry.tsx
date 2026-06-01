'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useLanguage } from './LanguageProvider';
import Tag from './Tag';

interface FlowStreamEntryProps {
  date: string;     // YYYY-MM-DD
  slug: string;     // YYYY/MM/DD
  title?: string;
  body: ReactNode;  // server-pre-rendered MarkdownRenderer output
  tags: string[];
}

export default function FlowStreamEntry({ date, slug, title, body, tags }: FlowStreamEntryProps) {
  const { language } = useLanguage();
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const hasExplicitTitle = title && title !== date;
  const d = new Date(`${date}T00:00:00`);

  return (
    <article
      id={date}
      className="scroll-mt-24 py-14 border-t border-muted/10 first:border-t-0 first:pt-2"
    >
      <header className="mb-7">
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted/60">
          {d.toLocaleDateString(locale, { weekday: 'long' })}
        </div>
        <Link href={`/flows/${slug}`} className="no-underline group inline-block mt-1">
          <time
            dateTime={date}
            className="font-serif text-2xl text-heading group-hover:text-accent transition-colors"
          >
            {d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
        </Link>
        {hasExplicitTitle && (
          <h2 className="mt-3 font-serif text-xl font-semibold text-heading">{title}</h2>
        )}
      </header>

      <div className="prose prose-lg dark:prose-invert max-w-none">
        {body}
      </div>

      {tags.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-2">
          {tags.map(tag => (
            <Tag key={tag} tag={tag} variant="compact" />
          ))}
        </div>
      )}
    </article>
  );
}
