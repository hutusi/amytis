import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { resolveImageUrl } from '@/lib/json-ld';
import { withTrailingSlash } from '@/lib/urls';
import { buildArticleMetadata } from '@/lib/metadata';
import RedirectPage from '@/components/RedirectPage';
import RenderPostPage from '@/components/RenderPostPage';
import { prefixedPostParams, resolvePrefixedPost } from '@/lib/route-aliases';

export async function generateStaticParams() {
  return prefixedPostParams();
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { slug: prefix, postSlug: rawPostSlug } = await params;
  const resolution = resolvePrefixedPost(prefix, rawPostSlug);

  if (!resolution) {
    return { title: 'Post Not Found' };
  }

  const { post } = resolution;
  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');

  // For redirect pages, return minimal metadata pointing to the canonical URL
  if (resolution.kind === 'redirect') {
    return {
      title: post.title,
      alternates: { canonical: withTrailingSlash(`${siteUrl}${resolution.to}`) },
    };
  }

  return buildArticleMetadata({
    title: post.title,
    description: post.excerpt,
    publishedTime: post.date,
    authors: post.authors,
    ogImage: resolveImageUrl(post.coverImage, siteConfig.ogImage, siteUrl),
    twitterCard: 'summary_large_image',
  });
}

export default async function PrefixPostPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug: prefix, postSlug: rawPostSlug } = await params;
  const resolution = resolvePrefixedPost(prefix, rawPostSlug);
  if (!resolution) {
    notFound();
  }

  // If the canonical URL differs from the current path, render a redirect page.
  if (resolution.kind === 'redirect') {
    return <RedirectPage to={resolution.to} />;
  }

  return <RenderPostPage post={resolution.post} />;
}
