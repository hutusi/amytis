'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import HorizontalScroll from './HorizontalScroll';
import CoverImage from './CoverImage';
import SectionHeading from './ui/SectionHeading';
import { useLanguage } from './LanguageProvider';
import { shuffle } from '@/lib/shuffle';
import { byDateAsc, byDateDesc } from '@/lib/sort';
import { getPostUrl, getSeriesListUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';
import { COVER_ZOOM } from '@/lib/ui-classes';

export interface SeriesItem {
  name: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  url: string;
  postCount: number;
  topPosts: { slug: string; title: string }[];
  date: string;
}

type SeriesOrder = 'shuffle' | 'date-desc' | 'date-asc';

interface CuratedSeriesSectionProps {
  allSeries: SeriesItem[];
  maxItems: number;
  order?: SeriesOrder;
}

function canonicalOrder(series: SeriesItem[], order: SeriesOrder): SeriesItem[] {
  if (order === 'date-desc') return [...series].sort(byDateDesc);
  if (order === 'date-asc')  return [...series].sort(byDateAsc);
  return series;
}

export default function CuratedSeriesSection({ allSeries, maxItems, order = 'shuffle' }: CuratedSeriesSectionProps) {
  const { t } = useLanguage();
  // SSR renders the canonical input order so server and client agree on first paint.
  // For 'shuffle', the post-mount useEffect swaps to a fresh random permutation,
  // so every reload re-rolls without any hydration mismatch.
  const [displayed, setDisplayed] = useState(() => canonicalOrder(allSeries, order).slice(0, maxItems));

  // Shuffle on mount so every reload re-rolls. SSR's canonical render is stable; the
  // post-hydration swap is the intentional client-only behaviour, not a sync issue.
  useEffect(() => {
    if (order === 'shuffle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayed(shuffle(allSeries).slice(0, maxItems));
    }
  }, [allSeries, maxItems, order]);

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(allSeries).slice(0, maxItems));
  }, [allSeries, maxItems]);

  if (allSeries.length === 0) return null;

  return (
    <section id="featured-series" className="mb-12 sm:mb-24">
      <div className="flex items-center justify-between mb-8">
        <SectionHeading>{t('curated_series')}</SectionHeading>
        <div className="flex items-center gap-4">
          {order === 'shuffle' && allSeries.length > maxItems && (
            <button
              onClick={handleShuffle}
              className="rounded-sm text-sm text-muted transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
              aria-label={t('shuffle_series')}
              title={t('shuffle_series')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>
          )}
          <Link href={getSeriesListUrl()} className="text-sm text-muted hover:text-accent transition-colors no-underline">
            {t('all_series')} →
          </Link>
        </div>
      </div>
      <HorizontalScroll>
        <div className={`flex gap-8 ${displayed.length > 1 ? 'pb-4' : ''}`}>
          {displayed.map((series, idx) => (
            <div
              key={series.name}
              className={`card-base group flex flex-col p-0 overflow-hidden snap-start ${
                displayed.length > 1
                  ? 'w-[85vw] md:w-[calc(50%-1rem)] flex-shrink-0'
                  : 'flex-1 md:max-w-[calc(50%-1rem)]'
              }`}
            >
              <Link href={series.url} className="relative h-44 w-full overflow-hidden bg-ink/[0.04] block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-inset">
                <CoverImage
                  src={series.coverImage}
                  title={series.title}
                  slug={series.name}
                  className={cn(COVER_ZOOM, 'duration-700')}
                  loading={idx === 0 ? 'eager' : undefined}
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
              </Link>
              <div className="p-6 flex flex-col flex-1 relative z-10">
                <div className="mb-4">
                  <span className="badge-accent">
                    {series.postCount} {t('parts')}
                  </span>
                </div>
                <h3 className="mb-3 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors line-clamp-2">
                  <Link href={series.url} className="no-underline focus:outline-none focus:text-accent">
                    {series.title}
                  </Link>
                </h3>
                <p className="mb-6 text-muted font-serif italic line-clamp-2 text-base">
                  {series.excerpt}
                </p>
                <div className="mt-auto pt-6 border-t border-ink/[0.05]">
                  <div className="flex flex-col gap-2">
                    {series.topPosts.map((p, idx) => (
                      <Link
                        key={p.slug}
                        href={getPostUrl({ slug: p.slug, series: series.name })}
                        className="flex items-center gap-3 group/link no-underline"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ink/[0.05] text-[10px] flex items-center justify-center font-mono text-muted group-hover/link:bg-accent/10 group-hover/link:text-accent transition-colors">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-foreground/80 group-hover/link:text-accent transition-colors truncate">
                          {p.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </HorizontalScroll>
    </section>
  );
}
