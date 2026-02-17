'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';

interface SeriesListProps {
  seriesSlug: string;
  seriesTitle: string;
  posts: PostData[];
  currentSlug: string;
}

export default function SeriesList({ seriesSlug, seriesTitle, posts, currentSlug }: SeriesListProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!posts || posts.length === 0) return null;

  const currentIndex = posts.findIndex(p => p.slug === currentSlug);
  const prevPost = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const nextPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;

  return (
    <div className="p-5 bg-muted/5 rounded-xl border border-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/series/${seriesSlug}`}
          className="group flex items-center gap-2 no-underline"
        >
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent">
            {t('series')}
          </span>
          <span className="text-[10px] text-muted">•</span>
          <span className="text-sm font-serif font-bold text-heading group-hover:text-accent transition-colors">
            {seriesTitle}
          </span>
        </Link>
        <span className="text-xs font-mono text-muted bg-muted/10 px-2 py-0.5 rounded-full">
          {currentIndex + 1}/{posts.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-accent/60 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / posts.length) * 100}%` }}
        />
      </div>

      {/* Prev / Next navigation */}
      <div className="flex gap-3 mb-3">
        {prevPost ? (
          <Link
            href={`/posts/${prevPost.slug}`}
            className="flex-1 flex items-center gap-2 py-2.5 px-3 rounded-lg bg-muted/5 hover:bg-muted/10 no-underline transition-colors group"
          >
            <svg className="w-4 h-4 flex-shrink-0 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <div className="min-w-0">
              <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-0.5">{t('prev')}</span>
              <span className="block text-sm text-foreground/80 group-hover:text-foreground truncate transition-colors">{prevPost.title}</span>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {nextPost ? (
          <Link
            href={`/posts/${nextPost.slug}`}
            className="flex-1 flex items-center justify-end gap-2 py-2.5 px-3 rounded-lg bg-muted/5 hover:bg-muted/10 no-underline transition-colors group text-right"
          >
            <div className="min-w-0">
              <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-0.5">{t('next')}</span>
              <span className="block text-sm text-foreground/80 group-hover:text-foreground truncate transition-colors">{nextPost.title}</span>
            </div>
            <svg className="w-4 h-4 flex-shrink-0 text-muted group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Toggle to expand full list */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-sans text-muted hover:text-accent transition-colors"
      >
        <span className="h-px flex-1 bg-muted/10" />
        <span className="flex items-center gap-1">
          {isExpanded ? t('hide') : t('all_posts')}
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        <span className="h-px flex-1 bg-muted/10" />
      </button>

      {/* Collapsible posts list */}
      {isExpanded && (
        <ol className="space-y-2 mt-3 animate-slide-down">
          {posts.map((post, index) => {
            const isCurrent = post.slug === currentSlug;
            const isPast = index < currentIndex;

            return (
              <li key={post.slug}>
                {isCurrent ? (
                  <div className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg bg-accent/5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-mono font-bold flex items-center justify-center">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-semibold text-accent truncate">
                      {post.title}
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/posts/${post.slug}`}
                    className="group flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/5 no-underline transition-colors"
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center transition-colors ${
                      isPast
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted/10 text-muted group-hover:bg-muted/20'
                    }`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-sm truncate transition-colors ${
                      isPast
                        ? 'text-foreground/70 group-hover:text-foreground'
                        : 'text-muted group-hover:text-foreground'
                    }`}>
                      {post.title}
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-muted/10">
        <Link
          href={`/series/${seriesSlug}`}
          className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
        >
          {t('view_full_series')}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
