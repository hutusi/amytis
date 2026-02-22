'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';
import Tag from '@/components/Tag';
import Pagination from '@/components/Pagination';

interface NoteItem {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
}

interface NoteContentProps {
  notes: NoteItem[];
  tags: Record<string, number>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    basePath: string;
  };
}

export default function NoteContent({ notes, tags, pagination }: NoteContentProps) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    if (!selectedTag) return notes;
    return notes.filter(n => n.tags.map(t => t.toLowerCase()).includes(selectedTag));
  }, [notes, selectedTag]);

  const sortedTags = Object.entries(tags).sort((a, b) => b[1] - a[1]);

  function handleTagSelect(tag: string) {
    setSelectedTag(prev => (prev === tag ? null : tag));
  }

  return (
    <div className="flex gap-10">
      {/* Tag sidebar */}
      <aside className="w-44 shrink-0 hidden md:block">
        <div className="sticky top-24 space-y-1">
          {sortedTags.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-3">{t('tags')}</p>
              <button
                onClick={() => setSelectedTag(null)}
                className={`block w-full text-left text-sm px-2 py-1 rounded transition-colors ${!selectedTag ? 'text-accent font-medium' : 'text-muted hover:text-foreground'}`}
              >
                {t('all_notes')}
              </button>
              {sortedTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => handleTagSelect(tag)}
                  className={`flex w-full items-center justify-between text-left text-sm px-2 py-1 rounded transition-colors ${selectedTag === tag ? 'text-accent font-medium' : 'text-muted hover:text-foreground'}`}
                >
                  <span>{tag}</span>
                  <span className="text-xs opacity-50">{count}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Note timeline */}
      <div className="flex-1 min-w-0">
        {selectedTag && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted">
            <span>{filteredNotes.length} / {notes.length}</span>
            <button
              onClick={() => setSelectedTag(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-muted/20 text-xs hover:border-accent hover:text-accent transition-colors"
            >
              ✕ {t('clear')}
            </button>
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <p className="text-muted">{t('no_flows')}</p>
        ) : (
          <div className="space-y-0">
            {filteredNotes.map(note => (
              <article key={note.slug} className="relative pl-6 pb-8 border-l-2 border-muted/20 last:pb-0">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
                <time className="text-xs font-mono text-accent">{note.date}</time>
                <h3 className="mt-1 mb-2 font-serif text-xl font-bold text-heading">
                  <Link href={`/notes/${note.slug}`} className="no-underline hover:text-accent transition-colors">
                    {note.title}
                  </Link>
                </h3>
                <p className="text-sm text-muted leading-relaxed line-clamp-3">{note.excerpt}</p>
                {note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {note.tags.map(tag => (
                      <Tag key={tag} tag={tag} variant="compact" />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
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
