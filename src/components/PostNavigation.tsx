'use client';

import { useSearchParams } from 'next/navigation';
import { resolveActiveCollection } from '@/lib/collections';
import Link from 'next/link';
import type { CollectionContext, PostNavItem } from '@/lib/content/types';
import { useLanguage } from './LanguageProvider';
import MetaLabel from './ui/MetaLabel';
import { getPostUrl, getPostUrlInCollection } from '@/lib/urls';

interface PostNavigationProps {
  prev: PostNavItem | null;
  next: PostNavItem | null;
  currentSlug?: string;
  collectionContexts?: CollectionContext[];
}

/** Prev/next links for a post, in series or `collectionParam` collection order. */
export function PostNavigationView({ prev, next, currentSlug, collectionContexts, collectionParam }: PostNavigationProps & { collectionParam: string | null }) {
  const { t } = useLanguage();
  const activeCollection = resolveActiveCollection(collectionContexts, collectionParam);

  // PostData satisfies PostNavItem, so prev/next widen cleanly; collection
  // entries are already PostNavItem.
  let effectivePrev: PostNavItem | null = prev;
  let effectiveNext: PostNavItem | null = next;

  if (activeCollection && currentSlug) {
    const posts = activeCollection.posts;
    const idx = posts.findIndex(p => p.slug === currentSlug);
    effectivePrev = idx > 0 ? posts[idx - 1] : null;
    effectiveNext = idx < posts.length - 1 ? posts[idx + 1] : null;
  }

  const postHref = (post: PostNavItem) =>
    activeCollection ? getPostUrlInCollection(post, activeCollection.slug) : getPostUrl(post);

  if (!effectivePrev && !effectiveNext) return null;

  return (
    <nav
      className="mt-12 pt-12 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3"
      aria-label={t('post_navigation')}
    >
      {effectivePrev && (
        <Link
          href={postHref(effectivePrev)}
          className="group flex flex-col gap-1.5 p-4 rounded-2xl border border-line hover:border-accent/30 hover:bg-accent/5 transition-all no-underline"
        >
          <MetaLabel className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('prev')}
          </MetaLabel>
          <span className="text-sm font-serif font-semibold text-heading group-hover:text-accent transition-colors line-clamp-2 leading-snug">
            {effectivePrev.title}
          </span>
          <span className="text-xs font-mono text-muted/60">{effectivePrev.date}</span>
        </Link>
      )}

      {effectiveNext && (
        <Link
          href={postHref(effectiveNext)}
          className={`group flex flex-col gap-1.5 p-4 rounded-2xl border border-line hover:border-accent/30 hover:bg-accent/5 transition-all no-underline sm:items-end sm:text-right${!effectivePrev ? ' sm:col-start-2' : ''}`}
        >
          <MetaLabel className="flex items-center gap-1.5">
            {t('next')}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </MetaLabel>
          <span className="text-sm font-serif font-semibold text-heading group-hover:text-accent transition-colors line-clamp-2 leading-snug">
            {effectiveNext.title}
          </span>
          <span className="text-xs font-mono text-muted/60">{effectiveNext.date}</span>
        </Link>
      )}
    </nav>
  );
}

/**
 * Reads `?collection=` and renders the view. `useSearchParams` bails the
 * surrounding Suspense boundary out of static prerendering, so layouts pass
 * `<PostNavigationView collectionParam={null} … />` as the boundary's fallback: the
 * exported HTML then carries the default (series-context) rendering instead
 * of an empty hole that pops in after hydration.
 */
export default function PostNavigation(props: PostNavigationProps) {
  const collectionParam = useSearchParams().get('collection');
  return <PostNavigationView {...props} collectionParam={collectionParam} />;
}
