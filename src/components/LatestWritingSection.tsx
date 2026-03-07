'use client';

import Link from 'next/link';
import PostList from './PostList';
import { useLanguage } from './LanguageProvider';
import { PostData } from '@/lib/markdown';
import { getPostsListUrl } from '@/lib/urls';

interface LatestWritingSectionProps {
  posts: PostData[];
}

export default function LatestWritingSection({ posts }: LatestWritingSectionProps) {
  const { t } = useLanguage();

  return (
    <section id="latest-posts">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-heading">{t('latest_writing')}</h2>
        <Link
          href={getPostsListUrl()}
          className="text-sm text-muted hover:text-accent transition-colors no-underline"
        >
          {t('all_posts')} →
        </Link>
      </div>

      <PostList posts={posts} showTags={false} excerptLines={1} />
    </section>
  );
}
