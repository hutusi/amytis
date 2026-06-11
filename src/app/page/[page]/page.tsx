import { getAllPosts } from '@/lib/content/posts';
import { siteConfig } from '../../../../site.config';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export async function generateStaticParams() {
  const allPosts = getAllPosts();
  const pageSize = siteConfig.pagination.posts;
  const totalPages = Math.ceil(allPosts.length / pageSize);

  // Generate params for pages 2 to totalPages
  const params = [];
  for (let i = 2; i <= totalPages; i++) {
    params.push({ page: i.toString() });
  }
  if (params.length === 0) return [{ page: '2' }];
  return params;
}

export const dynamicParams = false;

export default async function PaginatedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const currentPage = parseInt(page, 10);
  const allPosts = getAllPosts();
  const pageSize = siteConfig.pagination.posts;
  const totalPages = Math.ceil(allPosts.length / pageSize);

  if (isNaN(currentPage) || currentPage < 2 || currentPage > totalPages) {
    notFound();
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const posts = allPosts.slice(startIndex, endIndex);

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="latest_writing"
        subtitleKey="page_of_total"
        subtitleParams={{ page: currentPage, total: totalPages }}
      />

      <main>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </main>
    </div>
  );
}
