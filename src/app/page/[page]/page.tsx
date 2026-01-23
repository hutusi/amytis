import { getAllPosts } from '@/lib/markdown';
import { siteConfig } from '../../../../site.config';
import PostList from '@/components/PostList';
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
    <div className="layout-container">
      <header className="mb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-heading tracking-tight mb-4">
          {siteConfig.title}
        </h1>
        <p className="text-lg text-muted font-serif italic">
          {siteConfig.description}
        </p>
      </header>

      <main>
        <PostList posts={posts} />
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      </main>
    </div>
  );
}
