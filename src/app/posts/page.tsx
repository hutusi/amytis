import { getListingPosts } from '@/lib/markdown';
import PostList from '@/components/PostList';
import Pagination from '@/components/Pagination';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import { getPostsBasePath } from '@/lib/urls';
import { notFound } from 'next/navigation';

const PAGE_SIZE = siteConfig.pagination.posts;

export const metadata: Metadata = {
  title: `${t('posts')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Browse the complete archive of articles.',
};

export default function AllPostsPage() {
  if (getPostsBasePath() !== 'posts') notFound();
  const allPosts = getListingPosts();
  const page = 1;
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  const posts = allPosts.slice(0, PAGE_SIZE);

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="posts"
        subtitleKey="posts_subtitle"
        subtitleParams={{ count: allPosts.length }}
        className="mb-12"
      />

      <PostList posts={posts} />

      {totalPages > 1 && (
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath="/posts" />
        </div>
      )}
    </div>
  );
}
