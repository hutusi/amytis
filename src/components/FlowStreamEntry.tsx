'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import FlowDateHeader from './FlowDateHeader';
import Tag from './Tag';

interface FlowStreamEntryProps {
  date: string;     // YYYY-MM-DD
  slug: string;     // YYYY/MM/DD
  title?: string;
  body: ReactNode;  // server-pre-rendered MarkdownRenderer output
  tags: string[];
}

export default function FlowStreamEntry({ date, slug, title, body, tags }: FlowStreamEntryProps) {
  const hasExplicitTitle = title && title !== date;

  return (
    <article
      id={date}
      className="scroll-mt-24 py-14 border-t border-muted/10 first:border-t-0 first:pt-2"
    >
      <header className="mb-7">
        <Link href={`/flows/${slug}`} className="no-underline group block">
          <FlowDateHeader date={date} hoverable />
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
