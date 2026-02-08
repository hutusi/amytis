'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import HorizontalScroll from './HorizontalScroll';
import CoverImage from './CoverImage';

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

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function FeaturedStoriesSection({ allFeatured, maxItems, scrollThreshold }: FeaturedStoriesSectionProps) {
  const [displayed, setDisplayed] = useState(() => shuffle(allFeatured).slice(0, maxItems));

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(allFeatured).slice(0, maxItems));
  }, [allFeatured, maxItems]);

  if (allFeatured.length === 0) return null;

  return (
    <section className="mb-24">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-serif font-bold text-heading">Featured Stories</h2>
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
      <HorizontalScroll
        itemCount={displayed.length}
        scrollThreshold={scrollThreshold}
      >
        <div className={`flex gap-8 ${displayed.length > scrollThreshold ? 'pb-4' : 'flex-col'}`}>
          {displayed.map(post => (
            <div
              key={post.slug}
              className={`group snap-start ${
                displayed.length > scrollThreshold
                  ? 'w-[90vw] md:w-[70vw] lg:w-[60vw] flex-shrink-0'
                  : 'w-full'
              }`}
            >
              <div className={`grid grid-cols-1 ${displayed.length > scrollThreshold ? 'md:grid-cols-1 lg:grid-cols-12' : 'md:grid-cols-12'} gap-8 items-center`}>
                <Link href={`/posts/${post.slug}`} className={`${displayed.length > scrollThreshold ? 'lg:col-span-7' : 'md:col-span-7'} relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted/10 block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-background`}>
                  <CoverImage
                    src={post.coverImage}
                    title={post.title}
                    slug={post.slug}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                </Link>
                <div className={`${displayed.length > scrollThreshold ? 'lg:col-span-5' : 'md:col-span-5'} flex flex-col justify-center`}>
                  <div className="flex items-center gap-3 text-xs font-mono text-muted mb-6">
                    <span className="text-accent uppercase tracking-wider">{post.category}</span>
                    <span>•</span>
                    <span>{post.readingTime}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-heading mb-4 leading-snug group-hover:text-accent transition-colors line-clamp-2">
                    <Link href={`/posts/${post.slug}`} className="no-underline focus:outline-none focus:text-accent">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-muted text-base leading-relaxed mb-6 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted/80">
                    <span>{post.date}</span>
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
