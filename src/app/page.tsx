import Link from 'next/link';
import { getAllPosts } from '@/lib/markdown';
import { siteConfig } from '../../site.config';

export default function Home() {
  const allPosts = getAllPosts();
  const posts = allPosts.slice(0, siteConfig.pagination.pageSize);

  return (
    <div className="max-w-2xl mx-auto px-6 py-20 md:py-32">
      <header className="mb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-heading tracking-tight mb-4">
          {siteConfig.title}
        </h1>
        <p className="text-lg text-muted font-serif italic">
          {siteConfig.description}
        </p>
      </header>

      <main>
        <ul className="space-y-12">
          {posts.map((post) => (
            <li key={post.slug} className="group">
              <Link href={`/posts/${post.slug}`} className="block">
                <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-2">
                  <h2 className="text-2xl font-serif font-medium text-heading group-hover:text-accent transition-colors duration-200">
                    {post.title}
                  </h2>
                  <time className="text-sm font-mono text-muted shrink-0 md:ml-6 mt-1 md:mt-0">
                    {post.date}
                  </time>
                </div>
                <p className="text-foreground/80 leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {allPosts.length > siteConfig.pagination.pageSize && (
          <div className="mt-12 text-center">
            <Link href="/archive" className="text-accent hover:underline">
              View all posts →
            </Link>
          </div>
        )}
      </main>

      <footer className="mt-32 text-center text-sm text-muted">
        <p>{siteConfig.footerText}</p>
      </footer>
    </div>
  );
}
