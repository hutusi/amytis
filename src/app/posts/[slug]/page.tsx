import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';

/**
 * Generates the static paths for all blog posts at build time.
 * This ensures fast page loads and SEO optimization.
 */
export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Determine layout based on frontmatter
  const layout = post.layout || 'post';

  if (layout === 'simple') {
    return <SimpleLayout post={post} />;
  }

  const relatedPosts = getRelatedPosts(slug);

  // Default to standard post layout
  return <PostLayout post={post} relatedPosts={relatedPosts} />;
}