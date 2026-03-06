import { getPostBySlug, getAllPosts, getRelatedPosts, getSeriesPosts, getSeriesData, getAdjacentPosts, buildSlugRegistry, getBacklinks, PostData } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getPostsBasePath, getSeriesCustomPaths, getPostUrl } from '@/lib/urls';
import { buildPostJsonLd, serializeJsonLd } from '@/lib/json-ld';

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

export async function generateStaticParams() {
  const params: { slug: string; postSlug: string }[] = [];

  // Custom posts basePath — all posts served at /[basePath]/[slug]
  const basePath = getPostsBasePath();
  if (basePath !== 'posts') {
    getAllPosts().forEach(post => { params.push({ slug: basePath, postSlug: post.slug }); });
  }

  // Series custom paths — only posts belonging to that series
  for (const [seriesSlug, customPath] of Object.entries(getSeriesCustomPaths())) {
    getSeriesPosts(seriesSlug).forEach(post => { params.push({ slug: customPath, postSlug: post.slug }); });
  }

  // Placeholder keeps Next.js happy with output: export when no custom paths configured.
  // dynamicParams = false ensures any unrecognised slug/postSlug combo returns 404.
  return params.length > 0 ? params : [{ slug: '_', postSlug: '_' }];
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { postSlug: rawPostSlug } = await params;
  const post = resolvePostFromParam(rawPostSlug);

  if (!post) {
    return { title: 'Post Not Found' };
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

  // Validate the prefix is a known custom path
  const basePath = getPostsBasePath();
  const customPaths = getSeriesCustomPaths();
  const isValidBasePath = prefix === basePath && basePath !== 'posts';
  const matchedSeriesSlug = Object.entries(customPaths).find(([, path]) => path === prefix)?.[0];

  if (!isValidBasePath && !matchedSeriesSlug) {
    notFound();
  }

  const post = resolvePostFromParam(rawPostSlug);
  if (!post) {
    notFound();
  }

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
        prevPost={prev}
        nextPost={next}
        backlinks={backlinks}
        slugRegistry={slugRegistry}
      />
    </>
  );
}
