import { getAllAuthors, getPostsByAuthor } from '@/lib/markdown';
import PostList from '@/components/PostList';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const authors = getAllAuthors();
  return Object.keys(authors).map((author) => ({
    author: encodeURIComponent(author),
  }));
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ author: string }>;
}) {
  const { author } = await params;
  const decodedAuthor = decodeURIComponent(author);
  const posts = getPostsByAuthor(decodedAuthor);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="layout-container">
      <nav className="mb-16">
        <Link 
          href="/" 
          className="text-muted hover:text-accent transition-colors duration-200 font-sans text-sm flex items-center gap-1 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Home</span>
        </Link>
      </nav>

      <header className="mb-16">
        <h1 className="text-4xl font-serif font-bold text-heading mb-4">
          {decodedAuthor}
        </h1>
        <p className="text-lg text-muted font-serif italic">
          {posts.length} {posts.length === 1 ? 'entry' : 'entries'} written by this author.
        </p>
      </header>

      <main>
        <PostList posts={posts} />
      </main>
    </div>
  );
}
