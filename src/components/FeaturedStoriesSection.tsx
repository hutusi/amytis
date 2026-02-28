'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import CoverImage from './CoverImage';
import { useLanguage } from './LanguageProvider';
import { shuffle } from '@/lib/shuffle';

export interface FeaturedPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readingTime: string;
  coverImage?: string;
}

interface FeaturedStoriesSectionProps {
  allFeatured: FeaturedPost[];
  maxItems: number;
  scrollThreshold: number;
}

export default function FeaturedStoriesSection({ allFeatured, maxItems }: FeaturedStoriesSectionProps) {
  const { t } = useLanguage();
  const [displayed, setDisplayed] = useState(() => allFeatured.slice(0, maxItems));

  useEffect(() => {
    setDisplayed(shuffle(allFeatured).slice(0, maxItems));
  }, [allFeatured, maxItems]);

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(allFeatured).slice(0, maxItems));
  }, [allFeatured, maxItems]);

  if (allFeatured.length === 0) return null;

  const [hero, ...secondary] = displayed;

  return (
    <section className="mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-heading">{t('featured_articles')}</h2>
        {allFeatured.length > maxItems && (
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
        {/* Hero card — large */}
        <div className={secondary.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Link href={`/posts/${hero.slug}`} className="group block no-underline">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted/10 mb-5">
              <CoverImage
                src={hero.coverImage}
                title={hero.title}
                slug={hero.slug}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/10 transition-all duration-500" />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted mb-3">
              <span className="text-accent uppercase tracking-wider">{hero.category}</span>
              <span>·</span>
              <span>{hero.readingTime}</span>
              <span>·</span>
              <span>{hero.date}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-heading mb-3 leading-snug group-hover:text-accent transition-colors line-clamp-2">
              {hero.title}
            </h3>
            {hero.excerpt && (
              <p className="text-muted text-base leading-relaxed line-clamp-2">
                {hero.excerpt}
              </p>
            )}
          </Link>
        </div>

        {/* Secondary cards — compact horizontal */}
        {secondary.length > 0 && (
          <div className="lg:col-span-5 flex flex-col gap-5 lg:gap-6">
            {secondary.map(post => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                className="group flex gap-4 no-underline"
              >
                <div className="relative w-24 h-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted/10">
                  <CoverImage
                    src={post.coverImage}
                    title={post.title}
                    slug={post.slug}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-xs font-mono text-accent uppercase tracking-wider mb-1">{post.category}</span>
                  <h4 className="font-serif font-bold text-heading group-hover:text-accent transition-colors line-clamp-2 text-base leading-snug">
                    {post.title}
                  </h4>
                  <span className="text-xs font-mono text-muted/60 mt-1">{post.date}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
