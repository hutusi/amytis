import { buildSlugRegistry, getBacklinks } from '@/lib/content/discovery';
import { getRelatedPosts, getAdjacentPosts } from '@/lib/content/related';
import { getSeriesPosts, getSeriesData, getCollectionsForPost } from '@/lib/content/series';
import type { PostData } from '@/lib/content/types';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getPostUrl } from '@/lib/urls';
import RedirectPage from '@/components/RedirectPage';
import { buildPostJsonLd, serializeJsonLd } from '@/lib/json-ld';
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
      alternates: { canonical: `${siteUrl}${resolution.to}` },
    };
  }

  const ogImage =
    post.coverImage && !post.coverImage.startsWith('text:') && !post.coverImage.startsWith('./')
      ? post.coverImage
      : siteConfig.ogImage;

  return {
    title: `${post.title} | ${resolveLocale(siteConfig.title)}`,
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
      siteName: resolveLocale(siteConfig.title),
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  };
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

  const post = resolution.post;
  const layout = post.layout || 'post';

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const jsonLd = buildPostJsonLd({
    post,
    postUrl: `${siteUrl}${getPostUrl(post)}`,
    siteTitle: resolveLocale(siteConfig.title),
    siteUrl,
    defaultOgImage: siteConfig.ogImage,
  });
  const jsonLdScript = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />;

  if (layout === 'simple') {
    return <>{jsonLdScript}<SimpleLayout post={post} /></>;
  }

  const relatedPosts = getRelatedPosts(post.slug);
  const { prev, next } = getAdjacentPosts(post.slug);
  const slugRegistry = buildSlugRegistry();
  const backlinks = getBacklinks(post.slug);
  const collectionContexts = getCollectionsForPost(post.slug);
  let seriesPosts: PostData[] = [];
  let seriesTitle: string | undefined;

  if (post.series) {
    seriesPosts = getSeriesPosts(post.series);
    const seriesData = getSeriesData(post.series);
    seriesTitle = seriesData?.title;
  }

  return (
    <>
      {jsonLdScript}
      <PostLayout
        post={post}
        relatedPosts={relatedPosts}
        seriesPosts={seriesPosts}
        seriesTitle={seriesTitle}
        collectionContexts={collectionContexts}
        prevPost={prev}
        nextPost={next}
        backlinks={backlinks}
        slugRegistry={slugRegistry}
      />
    </>
  );
}
