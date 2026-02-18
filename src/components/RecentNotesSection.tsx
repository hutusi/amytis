'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

export interface RecentNoteItem {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
}

interface RecentNotesSectionProps {
  notes: RecentNoteItem[];
}

export default function RecentNotesSection({ notes }: RecentNotesSectionProps) {
  const { t } = useLanguage();

  if (notes.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-heading">{t('recent_notes')}</h2>
        <Link
          href="/flows"
          className="text-sm text-muted hover:text-accent transition-colors no-underline inline-flex items-center gap-1"
        >
          {t('all_flows')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      <div className="space-y-0">
        {notes.map(note => (
          <div key={note.slug} className="relative pl-6 pb-6 border-l-2 border-muted/20 last:pb-0">
            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
            <div className="flex items-baseline gap-3 mb-1">
              <time className="text-xs font-mono text-accent shrink-0">{note.date}</time>
              <Link
                href={`/flows/${note.slug}`}
                className="text-base font-serif font-bold text-heading hover:text-accent transition-colors no-underline truncate"
              >
                {note.title}
              </Link>
            </div>
            <p className="text-sm text-muted line-clamp-2 pl-0">{note.excerpt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
