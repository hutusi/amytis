'use client';

import Link from 'next/link';
import PostList from './PostList';
import SectionHeading from './ui/SectionHeading';
import { useLanguage } from './LanguageProvider';
import type { PostData } from '@/lib/content/types';
import { getPostsListUrl } from '@/lib/urls';

interface LatestWritingSectionProps {
  posts: PostData[];
}

export default function LatestWritingSection({ posts }: LatestWritingSectionProps) {
  const { t } = useLanguage();

  return (
    <section id="latest-posts">
      <div className="flex items-center justify-between mb-8">
        <SectionHeading>{t('latest_writing')}</SectionHeading>
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
