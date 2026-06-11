import { getAllPosts } from '@/lib/content/posts';
import { siteConfig } from '../../../../site.config';
import PostCard from '@/components/PostCard';
import Pagination from '@/components/Pagination';
import { notFound } from 'next/navigation';
import { paginate, paginationStaticParams } from '@/lib/pagination';
import PageHeader from '@/components/PageHeader';

export async function generateStaticParams() {
  return paginationStaticParams(getAllPosts().length, siteConfig.pagination.posts);
}

export const dynamicParams = false;

export default async function PaginatedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const currentPage = parseInt(page, 10);
  const slice = paginate(getAllPosts(), currentPage, siteConfig.pagination.posts);
  if (!slice || currentPage < 2) {
    notFound();
  }
  const { items: posts, totalPages } = slice;

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
