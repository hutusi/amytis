import Link from 'next/link';
import PostList from './PostList';
import SectionHeading from './ui/SectionHeading';
import { T } from './T';
import type { PostData } from '@/lib/content/types';

interface LatestWritingSectionProps {
  posts: PostData[];
  locale: string;
  /** The posts listing for "all posts", or null when the locale has none. */
  allPostsUrl: string | null;
}

export default function LatestWritingSection({ posts, locale, allPostsUrl }: LatestWritingSectionProps) {
  // Like the other home sections, nothing to show renders nothing.
  if (posts.length === 0) return null;

  return (
    <section id="latest-posts">
      <div className="flex items-center justify-between mb-8">
        <SectionHeading><T k="latest_writing" /></SectionHeading>
        {allPostsUrl && (
          <Link
            href={allPostsUrl}
            className="text-sm text-muted hover:text-accent transition-colors no-underline"
          >
            <T k="all_posts" /> →
          </Link>
        )}
      </div>

      <PostList posts={posts} locale={locale} showTags={false} excerptLines={1} />
    </section>
  );
}
