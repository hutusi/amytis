import { getPostBySlug, getAllPosts, getRelatedPosts, getSeriesPosts, PostData } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';

function safeDecodeParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

function resolvePostFromParam(rawSlug: string) {
  const decoded = safeDecodeParam(rawSlug);
  return (
    getPostBySlug(decoded) ||
    getPostBySlug(rawSlug) ||
    getPostBySlug(decoded.normalize('NFC')) ||
    getPostBySlug(decoded.normalize('NFD'))
  );
}

/**
 * Generates the static paths for all blog posts at build time.
 * This ensures fast page loads and SEO optimization.
 */
export async function generateStaticParams() {
  const posts = getAllPosts();
  const slugs = new Set<string>();

  for (const post of posts) {
    slugs.add(post.slug);
    slugs.add(encodeURIComponent(post.slug));
  }

  return [...slugs].map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const post = resolvePostFromParam(rawSlug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const ogImage = post.coverImage && !post.coverImage.startsWith('text:')
    ? post.coverImage
    : `/icon.svg`;

  return {
    title: `${post.title} | ${siteConfig.title}`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      authors: post.authors,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      siteName: siteConfig.title,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = safeDecodeParam(rawSlug);
  const post = resolvePostFromParam(rawSlug);

  if (!post) {
    notFound();
  }

  // Determine layout based on frontmatter
  const layout = post.layout || 'post';

  if (layout === 'simple') {
    return <SimpleLayout post={post} />;
  }

  const relatedPosts = getRelatedPosts(slug);
  let seriesPosts: PostData[] = [];
  
  if (post.series) {
    seriesPosts = getSeriesPosts(post.series);
  }

  // Default to standard post layout
  return <PostLayout post={post} relatedPosts={relatedPosts} seriesPosts={seriesPosts} />;
}
