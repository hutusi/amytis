import Link from 'next/link';
import PostList from './PostList';
import SectionHeading from './ui/SectionHeading';
import { T } from './T';
import type { PostData } from '@/lib/content/types';
import { getPostsListUrl, localizeUrl } from '@/lib/urls';

interface LatestWritingSectionProps {
  posts: PostData[];
  locale: string;
}

export default function LatestWritingSection({ posts, locale }: LatestWritingSectionProps) {
  return (
    <section id="latest-posts">
      <div className="flex items-center justify-between mb-8">
        <SectionHeading><T k="latest_writing" /></SectionHeading>
        <Link
          href={localizeUrl(getPostsListUrl(), locale)}
          className="text-sm text-muted hover:text-accent transition-colors no-underline"
        >
          <T k="all_posts" /> →
        </Link>
      </div>

      <PostList posts={posts} locale={locale} showTags={false} excerptLines={1} />
    </section>
  );
}
