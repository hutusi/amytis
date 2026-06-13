'use client';

import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { PostData, CollectionContext, Heading } from '@/lib/content/types';
import { useLanguage } from './LanguageProvider';
import { useImmersiveReading } from './ImmersiveReadingProvider';
import { useSidebarAutoScroll } from '@/hooks/useSidebarAutoScroll';
import InlineBookToc from './InlineBookToc';
import MetaLabel from './ui/MetaLabel';
import { getPostUrl, getPostUrlInCollection, getSeriesListUrl, getSeriesUrl } from '@/lib/urls';

// Dedicated TOC sidebar for the immersive reader on a series post. Visually
// mirrors BookSidebar's `mode="fill"` shape (clean numbered list, left-
// border accent on the current item, inlined headings under the current
// post, footer pointing at the listing page) rather than the page-mode
// SeriesList card — see PR #95 review feedback.

interface ImmersiveSeriesSidebarProps {
  seriesSlug: string;
  seriesTitle: string;
  posts: PostData[];
  /** When the post is in a collection, the sidebar can render in that
   *  collection's scope by appending `?collection=<slug>` to the URL. Same
   *  resolution logic as SeriesList. */
  collectionContexts?: CollectionContext[];
  currentSlug: string;
  /** h2/h3 headings for the current post — rendered as an inline TOC under
   *  the current post's row via the shared InlineBookToc component. */
  headings?: Heading[];
}

export default function ImmersiveSeriesSidebar({
  seriesSlug,
  seriesTitle,
  posts,
  collectionContexts,
  currentSlug,
  headings = [],
}: ImmersiveSeriesSidebarProps) {
  const { t } = useLanguage();
  const { enabled: immersiveEnabled } = useImmersiveReading();
  const searchParams = useSearchParams();
  const collectionParam = searchParams.get('collection');
  const activeCollection = collectionParam
    ? (collectionContexts ?? []).find(c => c.slug === collectionParam) ?? null
    : null;

  const effectiveSlug = activeCollection?.slug ?? seriesSlug;
  const effectiveTitle = activeCollection?.title ?? seriesTitle;
  const effectivePosts = activeCollection?.posts ?? posts;
  const isCollectionContext = !!activeCollection;

  // Collections mix posts from different layout segments (`/posts/[slug]` vs
  // `/[series]/[slug]`). When clicking across that boundary, the
  // ImmersiveReadingProvider remounts with `enabled=false` and the overlay
  // closes. Appending `?immersive=1` lets the destination layout's
  // ImmersiveReadingFlagHandler re-enter the reader and strip the flag.
  const postHref = (post: PostData) => {
    const base = activeCollection
      ? getPostUrlInCollection(post, activeCollection.slug)
      : getPostUrl(post);
    if (!immersiveEnabled) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}immersive=1`;
  };

  const currentIndex = effectivePosts.findIndex(p => p.slug === currentSlug);
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  useSidebarAutoScroll(sidebarRef, currentItemRef, currentSlug);

  if (effectivePosts.length === 0) return null;

  return (
    <aside
      ref={sidebarRef}
      className="block w-full h-full overflow-y-auto px-4 py-6 scrollbar-hide hover:scrollbar-thin"
    >
      {/* Header — series / collection label + post count + title link */}
      <div className="mb-6 pb-4 border-b border-ink/[0.05]">
        <div className="flex items-center justify-between mb-2">
          <MetaLabel tone="accent">
            {isCollectionContext ? t('collection') : t('series')}
          </MetaLabel>
          <span className="text-xs font-mono text-muted whitespace-nowrap">
            {currentIndex + 1}/{effectivePosts.length}
          </span>
        </div>
        <Link href={getSeriesUrl(effectiveSlug)} className="group block no-underline">
          <h3 className="font-serif font-bold text-heading text-lg leading-snug group-hover:text-accent transition-colors">
            {effectiveTitle}
          </h3>
        </Link>
      </div>

      {/* Posts list — flat, current with left-border + accent (same treatment
          as BookSidebar's chapter link). Past posts dimmed less than future
          posts, also matching BookSidebar. */}
      <nav aria-label={isCollectionContext ? t('collection') : t('series')}>
        <ul className="space-y-1">
          {effectivePosts.map((post, index) => {
            const isCurrent = post.slug === currentSlug;
            const isPast = index < currentIndex;
            return (
              <li key={post.slug} ref={isCurrent ? currentItemRef : undefined}>
                <Link
                  href={postHref(post)}
                  className={`block py-2 px-3 rounded-lg text-sm no-underline transition-all duration-200 ${
                    isCurrent
                      ? 'bg-accent/10 text-accent font-semibold border-l-2 border-accent'
                      : isPast
                        ? 'text-foreground/70 hover:text-foreground hover:bg-ink/[0.04]'
                        : 'text-muted hover:text-foreground hover:bg-ink/[0.04]'
                  }`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {post.title}
                </Link>
                {isCurrent && <InlineBookToc headings={headings} />}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — points at the series listing (not back to the current
          series detail, which the header already links to). Matches
          BookSidebar's "All Books" footer pattern. */}
      <div className="mt-6 pt-4 border-t border-ink/[0.05]">
        <Link
          href={getSeriesListUrl()}
          className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
        >
          {t('all_series')}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
