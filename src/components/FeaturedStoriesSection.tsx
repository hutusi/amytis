'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import CoverImage from './CoverImage';
import { useLanguage } from './LanguageProvider';
import { shuffle } from '@/lib/shuffle';
import { getPostUrl } from '@/lib/urls';

export interface FeaturedPost {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  date: string;
  category: string;
  readingTime: string;
  coverImage?: string;
  series?: string;
  pinned?: boolean;
}

interface FeaturedStoriesSectionProps {
  allFeatured: FeaturedPost[];
  maxItems: number;
}

function buildDisplayed(allFeatured: FeaturedPost[], maxItems: number, shuffledNonPinned: FeaturedPost[]): FeaturedPost[] {
  const pinned = allFeatured.filter(p => p.pinned);
  const nonPinned = allFeatured.filter(p => !p.pinned);

  const hero = pinned[0] ?? nonPinned[0];
  if (!hero) return [];

  const maxSecondaries = maxItems - 1;
  const fixedSecondaries = pinned.slice(1, maxSecondaries + 1); // cap to available secondary slots
  const shuffleSlots = Math.max(0, maxSecondaries - fixedSecondaries.length);

  // Non-pinned pool excludes the hero if the hero is non-pinned
  const heroIsNonPinned = !hero.pinned;
  const shufflePool = heroIsNonPinned ? nonPinned.filter(p => p.slug !== hero.slug) : nonPinned;
  const shuffledSlice = shuffledNonPinned.filter(p => shufflePool.some(q => q.slug === p.slug)).slice(0, shuffleSlots);

  return [hero, ...fixedSecondaries, ...shuffledSlice];
}

export default function FeaturedStoriesSection({ allFeatured, maxItems }: FeaturedStoriesSectionProps) {
  const { t } = useLanguage();

  const nonPinned = allFeatured.filter(p => !p.pinned);

  const [shuffledNonPinned, setShuffledNonPinned] = useState<FeaturedPost[]>(() => nonPinned);

  useEffect(() => {
    setShuffledNonPinned(shuffle(nonPinned));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFeatured]);

  const handleShuffle = useCallback(() => {
    setShuffledNonPinned(shuffle(nonPinned));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFeatured]);

  const displayed = buildDisplayed(allFeatured, maxItems, shuffledNonPinned);

  if (displayed.length === 0) return null;

  // Show shuffle button only when there are more non-pinned posts than available shuffle slots
  const pinned = allFeatured.filter(p => p.pinned);
  const fixedCount = 1 + Math.min(pinned.slice(1).length, maxItems - 1);
  const shuffleSlots = Math.max(0, maxItems - fixedCount);
  const canShuffle = nonPinned.length > shuffleSlots + (pinned.length === 0 ? 1 : 0);

  const [hero, ...secondary] = displayed;

  return (
    <section id="featured-posts" className="mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-heading">{t('featured_articles')}</h2>
        {canShuffle && (
          <button
            onClick={handleShuffle}
            className="text-sm text-muted hover:text-accent transition-colors focus:outline-none"
            aria-label="Shuffle featured stories"
            title="Show different stories"
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
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
              {/* Obi text band */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-2 text-xs font-mono text-white/60 mb-3">
                  <span className="text-accent uppercase tracking-wider">{hero.category}</span>
                  <span>·</span>
                  <span>{hero.readingTime}</span>
                  <span>·</span>
                  <span>{hero.date}</span>
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
                    <span className="text-accent uppercase tracking-wider truncate max-w-[5rem]">{post.category}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{post.readingTime}</span>
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
