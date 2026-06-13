import { getListingPosts } from '@/lib/content/posts';
import PostList from '@/components/PostList';
import Pagination from '@/components/Pagination';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createListingMetadata } from '@/lib/metadata';
import PageHeader from '@/components/PageHeader';
import { getPostsBasePath } from '@/lib/urls';
import { paginate, paginationStaticParams } from '@/lib/pagination';

const PAGE_SIZE = siteConfig.pagination.posts;

export function generateStaticParams() {
  // Disabled when posts live under a custom basePath ([slug]/page/[page] handles it)
  return paginationStaticParams(getListingPosts().length, PAGE_SIZE, {
    enabled: getPostsBasePath() === 'posts',
    disabledSentinel: '_',
  });
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  const allPosts = getListingPosts();
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  return createListingMetadata({ titleKey: 'posts', page: parseInt(page, 10), totalPages });
}

export default async function PostsPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr);
  const slice = paginate(getListingPosts(), page, PAGE_SIZE);
  if (!slice || page < 2) notFound();
  const { items: posts, totalPages } = slice;

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="posts"
        subtitleKey="page_of_total"
        subtitleParams={{ page, total: totalPages }}
        className="mb-12"
      />

      <PostList posts={posts} />

      <div className="mt-12">
        <Pagination currentPage={page} totalPages={totalPages} basePath="/posts" />
      </div>
    </div>
  );
}
