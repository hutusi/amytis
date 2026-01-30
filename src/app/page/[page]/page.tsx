import { getAllPosts } from '@/lib/markdown';
import { siteConfig } from '../../../../site.config';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const allPosts = getAllPosts();
  const pageSize = siteConfig.pagination.pageSize;
  const totalPages = Math.ceil(allPosts.length / pageSize);

  // Generate params for pages 2 to totalPages
  const params = [];
  for (let i = 2; i <= totalPages; i++) {
    params.push({ page: i.toString() });
  }
  return params;
}

export default async function PaginatedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const currentPage = parseInt(page, 10);
  const allPosts = getAllPosts();
  const pageSize = siteConfig.pagination.pageSize;
  const totalPages = Math.ceil(allPosts.length / pageSize);

  if (isNaN(currentPage) || currentPage < 2 || currentPage > totalPages) {
    notFound();
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const posts = allPosts.slice(startIndex, endIndex);

  return (
    <div className="layout-main">
      <header className="page-header">
        <h1 className="page-title">
          Latest Writing
        </h1>
        <p className="page-subtitle">
          Page {currentPage} of {totalPages}
        </p>
      </header>

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
