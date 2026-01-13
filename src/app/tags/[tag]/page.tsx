import { getAllTags, getPostsByTag } from '@/lib/markdown';
import PostList from '@/components/PostList';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const tags = getAllTags();
  return Object.keys(tags).map((tag) => ({
    tag: tag,
  }));
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  // Decode the tag in case it contains spaces or special characters
  const decodedTag = decodeURIComponent(tag);
  const posts = getPostsByTag(decodedTag);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
      <nav className="mb-16">
        <Link 
          href="/tags" 
          className="text-muted hover:text-accent transition-colors duration-200 font-sans text-sm flex items-center gap-1 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>All Tags</span>
        </Link>
      </nav>

      <header className="mb-16">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">
          <span className="text-muted font-light mr-2">#</span>
          {decodedTag}
        </h1>
        <p className="text-lg text-muted font-serif italic">
          {posts.length} {posts.length === 1 ? 'entry' : 'entries'} tagged with "{decodedTag}".
        </p>
      </header>

      <main>
        <PostList posts={posts} />
      </main>
    </div>
  );
}
