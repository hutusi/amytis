import { getAllPosts } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import PostList from '@/components/PostList';
import Pagination from '@/components/Pagination';

export default function Home() {
  const allPosts = getAllPosts();
  const page = 1;
  const pageSize = siteConfig.pagination.pageSize;
  const totalPages = Math.ceil(allPosts.length / pageSize);
  const posts = allPosts.slice(0, pageSize);

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 md:py-32">
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
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} />
        )}
      </main>

      <footer className="mt-32 text-center text-sm text-muted">
        <p>{siteConfig.footerText}</p>
      </footer>
    </div>
  );
}
