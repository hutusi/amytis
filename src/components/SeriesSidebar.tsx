'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { PostData } from '@/lib/markdown';

interface SeriesSidebarProps {
  seriesName: string;
  posts: PostData[];
  currentSlug: string;
}

export default function SeriesSidebar({ seriesName, posts, currentSlug }: SeriesSidebarProps) {
  const currentIndex = posts.findIndex(p => p.slug === currentSlug);
  const seriesSlug = seriesName.toLowerCase().replace(/ /g, '-');
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (currentItemRef.current && sidebarRef.current) {
      const sidebar = sidebarRef.current;
      const item = currentItemRef.current;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const sidebarHeight = sidebar.clientHeight;

      // Scroll so the current item is roughly centered in the sidebar
      sidebar.scrollTop = itemTop - sidebarHeight / 2 + itemHeight / 2;
    }
  }, [currentSlug]);

  return (
    <aside
      ref={sidebarRef}
      className="hidden lg:block sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto w-64 pr-4 scrollbar-hide"
    >
      {/* Series Header */}
      <div className="mb-6 pb-4 border-b border-muted/10">
        <Link
          href={`/series/${seriesSlug}`}
          className="group block no-underline"
        >
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent mb-2 block">
            Series
          </span>
          <h3 className="font-serif font-bold text-heading text-lg leading-snug group-hover:text-accent transition-colors">
            {seriesName}
          </h3>
        </Link>

        {/* Progress indicator */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1 bg-muted/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent/60 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / posts.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted whitespace-nowrap">
            {currentIndex + 1}/{posts.length}
          </span>
        </div>
      </div>

      {/* Posts List */}
      <nav aria-label="Series navigation">
        <ul className="space-y-1 relative">
          {/* Timeline connector line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-muted/15" />

          {posts.map((post, index) => {
            const isCurrent = post.slug === currentSlug;
            const isPast = index < currentIndex;

            return (
              <li key={post.slug} ref={isCurrent ? currentItemRef : undefined} className="relative">
                <Link
                  href={`/posts/${post.slug}`}
                  className={`group flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg no-underline transition-all duration-200 ${
                    isCurrent
                      ? 'bg-accent/5'
                      : 'hover:bg-muted/5'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {/* Number indicator */}
                  <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                    isCurrent
                      ? 'bg-accent text-white shadow-sm shadow-accent/30'
                      : isPast
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted/10 text-muted group-hover:bg-muted/20 group-hover:text-foreground'
                  }`}>
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <span className={`block text-sm leading-snug transition-colors ${
                      isCurrent
                        ? 'text-accent font-semibold'
                        : isPast
                          ? 'text-foreground/70 group-hover:text-foreground'
                          : 'text-muted group-hover:text-foreground'
                    }`}>
                      {post.title}
                    </span>
                    {post.readingTime && (
                      <span className="text-[10px] font-mono text-muted/60 mt-0.5 block">
                        {post.readingTime}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer link */}
      <div className="mt-6 pt-4 border-t border-muted/10">
        <Link
          href={`/series/${seriesSlug}`}
          className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
        >
          View full series
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
