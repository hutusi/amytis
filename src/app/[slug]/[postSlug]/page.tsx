import { getPostBySlug, getAllPosts, getAllSeries, getAllPages, getRelatedPosts, getSeriesPosts, getSeriesData, getAdjacentPosts, buildSlugRegistry, getBacklinks, getCollectionsForPost, PostData } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getPostsBasePath, getSeriesCustomPaths, getSeriesAutoPaths, validateSeriesAutoPaths, getPostUrl } from '@/lib/urls';
import RedirectPage from '@/components/RedirectPage';
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
  const customPaths = getSeriesCustomPaths();
  for (const [seriesSlug, customPath] of Object.entries(customPaths)) {
    getSeriesPosts(seriesSlug).forEach(post => { params.push({ slug: customPath, postSlug: post.slug }); });
  }

  // Series auto-paths — use series slug as URL prefix for posts in that series
  if (getSeriesAutoPaths()) {
    const allSeriesMap = getAllSeries();
    const allSeriesSlugs = Object.keys(allSeriesMap);
    const pageSlugSet = getAllPages().map(p => p.slug);
    validateSeriesAutoPaths(allSeriesSlugs, [...pageSlugSet, ...Object.values(customPaths)]); // Throws if any slug collides with a reserved route, static page, or customPaths prefix
    for (const seriesSlug of allSeriesSlugs) {
      if (seriesSlug in customPaths) continue; // Already handled by customPaths above
      allSeriesMap[seriesSlug].forEach(post => { params.push({ slug: seriesSlug, postSlug: post.slug }); });
    }
  }

  // redirectFrom entries — generate redirect pages for 2-segment old paths
  for (const post of getAllPosts()) {
    for (const from of post.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 2) continue;
      const [fromPrefix, fromPostSlug] = segments;
      if (from === getPostUrl(post)) continue;   // skip if this is already the canonical path
      params.push({ slug: fromPrefix, postSlug: fromPostSlug });
    }
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
  const { slug: prefix, postSlug: rawPostSlug } = await params;
  const currentPath = `/${safeDecodeParam(prefix)}/${safeDecodeParam(rawPostSlug)}`;
  const post =
    resolvePostFromParam(rawPostSlug) ??
    getAllPosts().find(candidate => candidate.redirectFrom?.includes(currentPath));

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const canonicalUrl = getPostUrl(post);

  // For redirect pages, return minimal metadata pointing to the canonical URL
  if (canonicalUrl !== currentPath) {
    return {
      title: post.title,
      alternates: { canonical: `${siteUrl}${canonicalUrl}` },
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
  const currentPath = `/${safeDecodeParam(prefix)}/${safeDecodeParam(rawPostSlug)}`;

  // Resolve the post: first by slug, then fall back to redirectFrom lookup for renamed slugs.
  const post =
    resolvePostFromParam(rawPostSlug) ??
    getAllPosts().find(candidate => candidate.redirectFrom?.includes(currentPath));
  if (!post) {
    notFound();
  }

  // Validate the prefix is a known path: custom basePath, series customPath, auto-path series slug,
  // or a legacy redirectFrom path declared on the resolved post.
  const basePath = getPostsBasePath();
  const customPaths = getSeriesCustomPaths();
  const isValidBasePath = prefix === basePath && basePath !== 'posts';
  const matchedSeriesSlug = Object.entries(customPaths).find(([, path]) => path === prefix)?.[0];
  const isAutoSeriesPath = getSeriesAutoPaths() && !(prefix in customPaths) && getSeriesData(prefix) !== null;
  const isLegacyRedirect = post.redirectFrom?.includes(currentPath) ?? false;

  if (!isValidBasePath && !matchedSeriesSlug && !isAutoSeriesPath && !isLegacyRedirect) {
    notFound();
  }

  // If the canonical URL differs from the current path, render a redirect page.
  const canonicalUrl = getPostUrl(post);
  if (canonicalUrl !== currentPath) {
    return <RedirectPage to={canonicalUrl} />;
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
