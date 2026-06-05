'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import CoverImage from './CoverImage';
import { useLanguage } from './LanguageProvider';
import { shuffle, shuffleSeeded } from '@/lib/shuffle';
import { getPostUrl } from '@/lib/urls';

export interface FeaturedPost {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  date: string;
  category: string;
  readingMinutes: number;
  coverImage?: string;
  series?: string;
  pinned?: boolean;
}

type PostOrder = 'shuffle' | 'date-desc' | 'date-asc';

interface FeaturedStoriesSectionProps {
  allFeatured: FeaturedPost[];
  maxItems: number;
  order?: PostOrder;
}

function applyOrder(posts: FeaturedPost[], order: PostOrder, seed: number): FeaturedPost[] {
  if (order === 'date-desc') return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (order === 'date-asc')  return [...posts].sort((a, b) => (a.date > b.date ? 1 : -1));
  return shuffleSeeded(posts, seed);
}

function buildDisplayed(allFeatured: FeaturedPost[], maxItems: number, orderedNonPinned: FeaturedPost[]): FeaturedPost[] {
  const pinned = allFeatured.filter(p => p.pinned);

  const hero = pinned[0] ?? orderedNonPinned[0];
  if (!hero) return [];

  const maxSecondaries = maxItems - 1;
  const fixedSecondaries = pinned.slice(1, maxSecondaries + 1); // cap to available secondary slots
  const fillSlots = Math.max(0, maxSecondaries - fixedSecondaries.length);

  // Non-pinned pool excludes the hero if the hero is non-pinned
  const heroIsNonPinned = !hero.pinned;
  const fillPool = heroIsNonPinned ? orderedNonPinned.filter(p => p.slug !== hero.slug) : orderedNonPinned;
  const fillSlice = fillPool.slice(0, fillSlots);

  return [hero, ...fixedSecondaries, ...fillSlice];
}

export default function FeaturedStoriesSection({ allFeatured, maxItems, order = 'shuffle' }: FeaturedStoriesSectionProps) {
  const { t } = useLanguage();

  const nonPinned = allFeatured.filter(p => !p.pinned);

  // Use a daily seed so SSR and client hydration agree on the initial order,
  // preventing a visible reshuffle flash on page load.
  const [orderedNonPinned, setOrderedNonPinned] = useState<FeaturedPost[]>(() => {
    const dailySeed = Math.floor(Date.now() / 86400000);
    return applyOrder(nonPinned, order, dailySeed);
  });

  const handleShuffle = useCallback(() => {
    setOrderedNonPinned(shuffle(nonPinned));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFeatured]);

  const displayed = buildDisplayed(allFeatured, maxItems, orderedNonPinned);

  if (displayed.length === 0) return null;

  // Show shuffle button only when shuffling AND there are more non-pinned posts than available slots
  const pinned = allFeatured.filter(p => p.pinned);
  const fixedCount = 1 + Math.min(pinned.slice(1).length, maxItems - 1);
  const shuffleSlots = Math.max(0, maxItems - fixedCount);
  const canShuffle = order === 'shuffle' && nonPinned.length > shuffleSlots + (pinned.length === 0 ? 1 : 0);

  const [hero, ...secondary] = displayed;

  return (
    <section id="featured-posts" className="mb-12 sm:mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-heading">{t('featured_articles')}</h2>
        {canShuffle && (
          <button
            onClick={handleShuffle}
            className="rounded-sm text-sm text-muted transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
            aria-label={t('shuffle_posts')}
            title={t('shuffle_posts')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Hero card — full image with obi (belly band) text overlay */}
        <div className={secondary.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Link href={getPostUrl(hero)} className={`group block no-underline${secondary.length > 0 ? ' h-full' : ''}`}>
            <div className={`relative overflow-hidden rounded-2xl bg-muted/10 ${secondary.length > 0 ? 'aspect-[16/9] lg:aspect-auto lg:h-full' : 'aspect-[16/9]'}`}>
              <CoverImage
                src={hero.coverImage}
                title={hero.title}
                slug={hero.slug}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
              {/* Obi text band */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-2 text-xs font-mono text-white/60 mb-3 overflow-hidden">
                  <span className="text-accent uppercase tracking-wider truncate min-w-0">{hero.category}</span>
                  <span className="shrink-0">·</span>
                  <span className="shrink-0 whitespace-nowrap">{hero.readingMinutes} {t('reading_time')}</span>
                  <span className="shrink-0">·</span>
                  <span className="shrink-0 whitespace-nowrap">{hero.date}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3 leading-snug group-hover:text-accent/90 transition-colors line-clamp-2">
                  {hero.title}
                </h3>
                {(hero.subtitle || hero.excerpt) && (
                  <p className="text-white/65 text-sm leading-relaxed line-clamp-1">
                    {hero.subtitle || hero.excerpt}
                  </p>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Secondary cards — box style with flush right image */}
        {secondary.length > 0 && (
          <div className="lg:col-span-5 flex flex-col gap-4">
            {secondary.map(post => (
              <Link
                key={post.slug}
                href={getPostUrl(post)}
                className="group flex no-underline rounded-2xl border border-muted/20 bg-muted/5 overflow-hidden hover:border-accent/30 hover:bg-muted/10 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 h-32"
              >
                {/* Text content */}
                <div className="flex-1 p-4 flex flex-col min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted mb-2">
                    <span className="text-accent uppercase tracking-wider truncate max-w-[4rem]">{post.category}</span>
                    <span className="shrink-0 hidden sm:inline">·</span>
                    <span className="shrink-0 hidden sm:inline">{post.readingMinutes} {t('reading_time')}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{post.date}</span>
                  </div>
                  <h4 className="font-serif font-bold text-heading group-hover:text-accent transition-colors line-clamp-2 text-base leading-snug">
                    {post.title}
                  </h4>
                  {(post.subtitle || post.excerpt) && (
                    <p className="text-xs text-muted leading-relaxed line-clamp-1 mt-1">
                      {post.subtitle || post.excerpt}
                    </p>
                  )}
                </div>
                {/* Cover image — flush to right edge, full card height */}
                <div className="relative w-32 flex-shrink-0 overflow-hidden bg-muted/10">
                  <CoverImage
                    src={post.coverImage}
                    title={post.title}
                    slug={post.slug}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
