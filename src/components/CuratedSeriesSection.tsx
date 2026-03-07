'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import HorizontalScroll from './HorizontalScroll';
import CoverImage from './CoverImage';
import { useLanguage } from './LanguageProvider';
import { shuffle, shuffleSeeded } from '@/lib/shuffle';
import { getPostUrl } from '@/lib/urls';

export interface SeriesItem {
  name: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  url: string;
  postCount: number;
  topPosts: { slug: string; title: string }[];
}

interface CuratedSeriesSectionProps {
  allSeries: SeriesItem[];
  maxItems: number;
  scrollThreshold: number;
}

export default function CuratedSeriesSection({ allSeries, maxItems, scrollThreshold }: CuratedSeriesSectionProps) {
  const { t } = useLanguage();
  // Use a daily seed so SSR and client hydration agree on the initial order,
  // preventing a visible reshuffle flash on page load.
  const [displayed, setDisplayed] = useState(() => {
    const dailySeed = Math.floor(Date.now() / 86400000);
    return shuffleSeeded(allSeries, dailySeed).slice(0, maxItems);
  });

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(allSeries).slice(0, maxItems));
  }, [allSeries, maxItems]);

  if (allSeries.length === 0) return null;

  return (
    <section id="featured-series" className="mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-heading">{t('curated_series')}</h2>
        <div className="flex items-center gap-4">
          {allSeries.length > maxItems && (
            <button
              onClick={handleShuffle}
              className="text-sm text-muted hover:text-accent transition-colors focus:outline-none"
              aria-label={t('shuffle_series')}
              title={t('shuffle_series')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>
          )}
          <Link href="/series" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline focus:outline-none focus:text-accent">
            {t('all_series')} →
          </Link>
        </div>
      </div>
      <HorizontalScroll
        itemCount={displayed.length}
        scrollThreshold={scrollThreshold}
      >
        <div className={`flex gap-8 ${displayed.length > scrollThreshold ? 'pb-4' : ''}`}>
          {displayed.map((series, idx) => (
            <div
              key={series.name}
              className={`card-base group flex flex-col p-0 overflow-hidden snap-start ${
                displayed.length > scrollThreshold
                  ? 'w-[85vw] md:w-[calc(50%-1rem)] flex-shrink-0'
                  : 'flex-1 md:max-w-[calc(50%-1rem)]'
              }`}
            >
              <Link href={series.url} className="relative h-44 w-full overflow-hidden bg-muted/10 block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-inset">
                <CoverImage
                  src={series.coverImage}
                  title={series.title}
                  slug={series.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                <div className="mt-auto pt-6 border-t border-muted/10">
                  <div className="flex flex-col gap-2">
                    {series.topPosts.map((p, idx) => (
                      <Link
                        key={p.slug}
                        href={getPostUrl({ slug: p.slug, series: series.name })}
                        className="flex items-center gap-3 group/link no-underline"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted/10 text-[10px] flex items-center justify-center font-mono text-muted group-hover/link:bg-accent/10 group-hover/link:text-accent transition-colors">
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
