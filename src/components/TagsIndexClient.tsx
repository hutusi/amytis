'use client';

import Link from 'next/link';
import { useState } from 'react';

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

export default function TagsIndexClient({ tags }: TagsIndexClientProps) {
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

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-10">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tags…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted/5 border border-muted/15 rounded-lg outline-none focus:border-accent/40 text-foreground placeholder:text-muted/40 transition-colors"
          />
        </div>

        <div className="flex rounded-lg border border-muted/15 overflow-hidden text-xs font-sans font-semibold self-start">
          <button
            onClick={() => setSort('popular')}
            className={`px-4 py-2 transition-colors ${sort === 'popular' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
          >
            Popular
          </button>
          <button
            onClick={() => setSort('alpha')}
            className={`px-4 py-2 border-l border-muted/15 transition-colors ${sort === 'alpha' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground hover:bg-muted/5'}`}
          >
            A–Z
          </button>
        </div>
      </div>

      {/* Result count when filtering */}
      {filter && (
        <p className="text-xs font-mono text-muted mb-6">
          {filtered.length} / {total} tags
        </p>
      )}

      {/* Size-scaled tag cloud */}
      <div className="flex flex-wrap gap-3 items-baseline">
        {filtered.map(([tag, count]) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className={`group inline-flex items-baseline gap-1.5 rounded-xl border border-muted/20 bg-muted/5 hover:bg-background hover:border-accent hover:shadow-md hover:shadow-accent/5 no-underline transition-all duration-200 ${getTagClasses(count, min, max)}`}
          >
            <span className="text-foreground group-hover:text-accent transition-colors">{tag}</span>
            <span className="font-mono text-muted/50 group-hover:text-accent/50 transition-colors" style={{ fontSize: '0.7em' }}>{count}</span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted italic">No tags match &ldquo;{filter}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
