'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { PostData, CollectionContext } from '@/lib/content/types';
import { useLanguage } from './LanguageProvider';
import MetaLabel from './ui/MetaLabel';
import { getPostUrl, getPostUrlInCollection } from '@/lib/urls';

interface PostNavigationProps {
  prev: PostData | null;
  next: PostData | null;
  currentSlug?: string;
  collectionContexts?: CollectionContext[];
}

export default function PostNavigation({ prev, next, currentSlug, collectionContexts }: PostNavigationProps) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const collectionParam = searchParams.get('collection');
  const activeCollection = collectionParam
    ? (collectionContexts ?? []).find(c => c.slug === collectionParam) ?? null
    : null;

  let effectivePrev = prev;
  let effectiveNext = next;

  if (activeCollection && currentSlug) {
    const posts = activeCollection.posts;
    const idx = posts.findIndex(p => p.slug === currentSlug);
    effectivePrev = idx > 0 ? posts[idx - 1] : null;
    effectiveNext = idx < posts.length - 1 ? posts[idx + 1] : null;
  }

  const postHref = (post: PostData) =>
    activeCollection ? getPostUrlInCollection(post, activeCollection.slug) : getPostUrl(post);

  if (!effectivePrev && !effectiveNext) return null;

  return (
    // suppressHydrationWarning on locale-bound nodes is a band-aid for the
    // known static-export + client-i18n drift: SSR renders defaultLocale,
    // `useLanguage()` hook serves the user's saved locale on hydration. The
    // real fix is per-locale URL routing, tracked as a separate refactor.
    <nav
      className="mt-12 pt-12 border-t border-ink/[0.07] grid grid-cols-1 sm:grid-cols-2 gap-3"
      aria-label={t('post_navigation')}
      suppressHydrationWarning
    >
      {effectivePrev && (
        <Link
          href={postHref(effectivePrev)}
          className="group flex flex-col gap-1.5 p-4 rounded-2xl border border-ink/[0.06] hover:border-accent/30 hover:bg-accent/5 transition-all no-underline"
        >
          <MetaLabel className="flex items-center gap-1.5" suppressHydrationWarning>
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
          className={`group flex flex-col gap-1.5 p-4 rounded-2xl border border-ink/[0.06] hover:border-accent/30 hover:bg-accent/5 transition-all no-underline sm:items-end sm:text-right${!effectivePrev ? ' sm:col-start-2' : ''}`}
        >
          <MetaLabel className="flex items-center gap-1.5" suppressHydrationWarning>
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
