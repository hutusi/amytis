'use client';

import Link from 'next/link';
import PostList from './PostList';
import { useLanguage } from './LanguageProvider';
import { PostData } from '@/lib/markdown';
import { getPostsListUrl } from '@/lib/urls';

interface LatestWritingSectionProps {
  posts: PostData[];
  totalCount: number;
}

export default function LatestWritingSection({ posts, totalCount }: LatestWritingSectionProps) {
  const { t, tWith } = useLanguage();

  return (
    <section id="latest-posts">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-serif font-bold text-heading">{t('latest_writing')}</h2>
        <Link
          href={getPostsListUrl()}
          className="text-sm text-muted hover:text-accent transition-colors no-underline inline-flex items-center gap-1"
        >
          {tWith('view_all_posts', { count: totalCount })}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      <PostList posts={posts} showTags={false} excerptLines={1} />
    </section>
  );
}
