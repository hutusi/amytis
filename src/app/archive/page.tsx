import Link from 'next/link';
import { getAllPosts } from '@/lib/markdown';

export const metadata = {
  title: 'Archive | Amytis',
  description: 'A complete list of all notes and thoughts.',
};

export default function ArchivePage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      <header className="mb-16">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">Archive</h1>
        <p className="text-lg text-muted font-serif italic">
          All entries in the garden.
        </p>
      </header>

      <main>
        <div className="relative border-l border-muted/20 ml-3 space-y-12">
          {posts.map((post) => (
            <div key={post.slug} className="relative pl-8">
              <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-muted/40 ring-4 ring-background"></span>
              <article className="group">
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                    <h2 className="text-xl font-serif font-medium text-heading group-hover:text-accent transition-colors duration-200">
                      {post.title}
                    </h2>
                    <time className="text-sm font-mono text-muted shrink-0 sm:ml-4">
                      {post.date}
                    </time>
                  </div>
                </Link>
              </article>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
