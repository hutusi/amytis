'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Heading, CollectionContext, PostNavItem } from '@/lib/content/types';
import { getPostUrl, getPostUrlInCollection } from '@/lib/urls';
import { useLanguage } from './LanguageProvider';
import { useSidebarAutoScroll } from '@/hooks/useSidebarAutoScroll';
import { padNumber } from '@/lib/format-utils';
import TocPanel from './TocPanel';
import ShareBar from './ShareBar';
import MetaLabel from './ui/MetaLabel';
import { siteConfig } from '../../site.config';

interface PostSidebarProps {
  seriesSlug?: string;
  seriesTitle?: string;
  posts?: PostNavItem[];
  collectionContexts?: CollectionContext[];
  currentSlug: string;
  headings: Heading[];
  localeHeadings?: Record<string, Heading[]>;
  shareUrl?: string;
  shareTitle?: string;
}

function getVisibleIndices(total: number, current: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const result: (number | 'ellipsis')[] = [];
  result.push(0);
  const windowStart = Math.max(1, current - 2);
  const windowEnd = Math.min(total - 2, current + 2);
  if (windowStart > 1) result.push('ellipsis');
  for (let i = windowStart; i <= windowEnd; i++) result.push(i);
  if (windowEnd < total - 2) result.push('ellipsis');
  result.push(total - 1);
  return result;
}

export default function PostSidebar({ seriesSlug, seriesTitle, posts, collectionContexts, currentSlug, headings, localeHeadings, shareUrl, shareTitle }: PostSidebarProps) {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const collectionParam = searchParams.get('collection');
  const activeCollection = collectionParam
    ? (collectionContexts ?? []).find(c => c.slug === collectionParam) ?? null
    : null;

  const effectiveSlug = activeCollection?.slug ?? seriesSlug;
  const effectiveTitle = activeCollection?.title ?? seriesTitle;
  const effectivePosts = activeCollection?.posts ?? posts;
  const isCollectionContext = !!activeCollection;

  const postHref = (post: PostNavItem) =>
    isCollectionContext ? getPostUrlInCollection(post, activeCollection!.slug) : getPostUrl(post);

  const activeHeadings = localeHeadings?.[language] ?? headings;
  const hasSeries = !!(effectiveSlug && effectivePosts && effectivePosts.length > 0);
  const currentIndex = hasSeries ? effectivePosts!.findIndex(p => p.slug === currentSlug) : -1;
  // Progress, the "X / N" counter, and "past" styling all key off the rendered
  // order (effectivePosts) so the badge number, counter, and completed styling
  // always agree. The series' own sort config (date-desc default, date-asc, or
  // manual/collection order) decides that order — the sidebar just reflects it.
  const progressIndex = currentIndex;
  const currentItemRef = useRef<HTMLLIElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [seriesCollapsed, setSeriesCollapsed] = useState(false);
  useSidebarAutoScroll(sidebarRef, currentItemRef, currentSlug);

  return (
    // suppressHydrationWarning on locale-bound nodes is a band-aid for the
    // known static-export + client-i18n drift: SSR renders defaultLocale,
    // `useLanguage()` hook serves the user's saved locale on hydration. The
    // real fix is per-locale URL routing, tracked as a separate refactor.
    <aside
      ref={sidebarRef}
      data-testid="post-sidebar"
      className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin select-none"
    >
      {/* TOC — always at top */}
      <TocPanel
        headings={activeHeadings}
        className={`mb-6 ${hasSeries ? 'pb-4 border-b border-line' : ''}`}
      />

      {/* Series / Collection section — below TOC */}
      {hasSeries && (
        <div>
          {/* Header — always visible */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <MetaLabel tone="accent" suppressHydrationWarning>
                {isCollectionContext ? t('collection') : t('series')}
              </MetaLabel>
              <span className="text-[10px] font-mono text-muted/60">
                {progressIndex >= 0 ? progressIndex + 1 : '?'} / {effectivePosts!.length}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <Link href={`/series/${effectiveSlug}`} className="group block no-underline flex-1 min-w-0">
                <h3 className="font-serif font-bold text-heading text-base leading-snug group-hover:text-accent transition-colors">
                  {effectiveTitle}
                </h3>
              </Link>
              <button
                onClick={() => setSeriesCollapsed(prev => !prev)}
                className="flex-shrink-0 mt-0.5 text-muted hover:text-foreground transition-colors"
                aria-label={seriesCollapsed ? t('expand_series') : t('collapse_series')}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${seriesCollapsed ? '' : 'rotate-180'}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Collapsible: post list + footer link */}
          {!seriesCollapsed && (
            <>
              <nav aria-label={t('series_navigation')} className="mb-4 animate-slide-down">
                <ul className="space-y-1 relative before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-px before:bg-surface-soft">
                  {getVisibleIndices(effectivePosts!.length, currentIndex).map((item, i) => {
                    if (item === 'ellipsis') {
                      return (
                        <li key={`ellipsis-${i}`} className="flex items-center py-1 pl-3">
                          <span className="text-xs font-mono text-muted/40 tracking-widest">···</span>
                        </li>
                      );
                    }
                    const post = effectivePosts![item];
                    const isCurrent = post.slug === currentSlug;
                    const isPast = item < progressIndex;

                    return (
                      <li key={post.slug} ref={isCurrent ? currentItemRef : undefined} className="relative">
                        <Link
                          href={postHref(post)}
                          className={`group flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg no-underline transition-all duration-200 ${
                            isCurrent ? 'bg-accent/5' : 'hover:bg-surface-soft'
                          }`}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                            isCurrent
                              ? 'bg-accent text-white shadow-sm shadow-accent/30'
                              : isPast
                                ? 'bg-accent/20 text-accent'
                                : 'bg-surface-soft text-muted group-hover:bg-surface-raised group-hover:text-foreground'
                          }`}>
                            {padNumber(item + 1)}
                          </div>
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
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <Link
                href={`/series/${effectiveSlug}`}
                className="text-xs font-sans text-muted hover:text-accent transition-colors no-underline flex items-center gap-1"
                suppressHydrationWarning
              >
                {isCollectionContext ? t('view_full_collection') : t('view_full_series')}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}
        </div>
      )}

      {shareUrl && siteConfig.share?.enabled && (
        <div className="mt-6 pt-6 border-t border-line">
          <MetaLabel as="p" className="mb-3" suppressHydrationWarning>
            {t('share_post')}
          </MetaLabel>
          <ShareBar url={shareUrl} title={shareTitle ?? ''} />
        </div>
      )}
    </aside>
  );
}
