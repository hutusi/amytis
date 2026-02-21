'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import { useLanguage } from './LanguageProvider';

interface TagsIndexClientProps {
  tags: Record<string, number>;
}

type SortMode = 'popular' | 'alpha';

function getTagClasses(count: number, min: number, max: number): string {
  const ratio = max === min ? 0.5 : (count - min) / (max - min);
  if (ratio >= 0.8) return 'text-xl font-bold px-5 py-2.5';
  if (ratio >= 0.6) return 'text-lg font-semibold px-5 py-2';
  if (ratio >= 0.4) return 'text-base font-medium px-4 py-2';
  if (ratio >= 0.2) return 'text-sm px-3.5 py-1.5';
  return 'text-xs px-3 py-1.5';
}

function TagLink({ tag, count, min, max }: { tag: string; count: number; min: number; max: number }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className={`group inline-flex items-baseline gap-1.5 rounded-xl border border-muted/20 bg-muted/5 hover:bg-background hover:border-accent hover:shadow-md hover:shadow-accent/5 no-underline transition-all duration-200 ${getTagClasses(count, min, max)}`}
    >
      <span className="text-foreground group-hover:text-accent transition-colors">{tag}</span>
      <span className="font-mono text-muted/50 group-hover:text-accent/50 transition-colors" style={{ fontSize: '0.7em' }}>{count}</span>
    </Link>
  );
}

export default function TagsIndexClient({ tags }: TagsIndexClientProps) {
  const { t, tWith } = useLanguage();
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortMode>('popular');

  const total = Object.keys(tags).length;
  const allEntries = Object.entries(tags);
  const counts = allEntries.map(([, c]) => c);
  const min = Math.min(...counts);
  const max = Math.max(...counts);

  const filtered = allEntries
    .filter(([tag]) => !filter || tag.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) =>
      sort === 'popular'
        ? b[1] - a[1]
        : a[0].localeCompare(b[0])
    );

  // Group by first letter for A-Z mode
  const letterGroups = sort === 'alpha'
    ? filtered.reduce<Record<string, [string, number][]>>((acc, entry) => {
        const letter = /^[a-zA-Z]/.test(entry[0]) ? entry[0][0].toUpperCase() : '#';
        if (!acc[letter]) acc[letter] = [];
        acc[letter].push(entry);
        return acc;
      }, {})
    : null;

  const sortedLetters = letterGroups
    ? Object.keys(letterGroups).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))
    : null;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <div className="relative flex-1 max-w-sm">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tags…"
            aria-label={t('filter_tags')}
            className="w-full pl-9 pr-8 py-2 text-sm bg-muted/5 border border-muted/15 rounded-lg outline-none focus:border-accent/40 text-foreground placeholder:text-muted/40 transition-colors"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted/40 hover:text-muted transition-colors p-0.5 rounded"
              aria-label="Clear filter"
            >
              <LuX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-muted/15 overflow-hidden text-xs font-sans font-semibold self-start">
          <button
            type="button"
            onClick={() => setSort('popular')}
            aria-pressed={sort === 'popular'}
            className={`px-4 py-2 transition-colors ${sort === 'popular' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
          >
            {t('sort_popular')}
          </button>
          <button
            type="button"
            onClick={() => setSort('alpha')}
            aria-pressed={sort === 'alpha'}
            className={`px-4 py-2 border-l border-muted/15 transition-colors ${sort === 'alpha' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
          >
            {t('sort_az')}
          </button>
        </div>
      </div>

      {/* Result count when filtering */}
      {filter && (
        <p className="text-xs font-mono text-muted mb-6">
          {tWith('tags_count', { shown: filtered.length, total })}
        </p>
      )}

      {/* Popular mode: flat size-scaled cloud */}
      {sort === 'popular' && (
        <div className="flex flex-wrap gap-3 items-baseline">
          {filtered.map(([tag, count]) => (
            <TagLink key={tag} tag={tag} count={count} min={min} max={max} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted italic">{tWith('tags_no_match', { filter })}</p>
          )}
        </div>
      )}

      {/* A-Z mode: grouped under letter section headers */}
      {sort === 'alpha' && sortedLetters && (
        <div>
          {sortedLetters.length === 0 ? (
            <p className="text-sm text-muted italic">{tWith('tags_no_match', { filter })}</p>
          ) : (
            sortedLetters.map((letter, i) => (
              <div key={letter} className={i > 0 ? 'mt-10' : ''}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-mono font-bold text-muted/40 w-4">{letter}</span>
                  <div className="flex-1 h-px bg-muted/10" />
                </div>
                <div className="flex flex-wrap gap-3 items-baseline">
                  {letterGroups![letter].map(([tag, count]) => (
                    <TagLink key={tag} tag={tag} count={count} min={min} max={max} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
