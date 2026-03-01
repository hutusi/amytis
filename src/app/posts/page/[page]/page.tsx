import { getListingPosts } from '@/lib/markdown';
import PostList from '@/components/PostList';
import Pagination from '@/components/Pagination';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import { getPostsBasePath } from '@/lib/urls';

const PAGE_SIZE = siteConfig.pagination.posts;

export function generateStaticParams() {
  if (getPostsBasePath() !== 'posts') return []; // Route disabled; custom path handles this
  const allPosts = getListingPosts();
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);

  // Generate params for page 2 to totalPages (page 1 is handled by /posts/page.tsx)
  if (totalPages <= 1) return [{ page: '2' }];

  return Array.from({ length: totalPages - 1 }, (_, i) => ({
    page: (i + 2).toString(),
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `${t('posts')} - ${page} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function PostsPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr);
  const allPosts = getListingPosts();
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);

  if (isNaN(page) || page < 2 || page > totalPages) notFound();

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const posts = allPosts.slice(start, end);

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
