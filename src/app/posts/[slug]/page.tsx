import { getPostBySlug, getAllPosts, getRelatedPosts, getSeriesPosts, getSeriesData, getAdjacentPosts, buildSlugRegistry, getBacklinks, getCollectionsForPost, PostData } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getPostsBasePath, getPostUrl } from '@/lib/urls';
import { buildPostJsonLd, serializeJsonLd, resolveImageUrl } from '@/lib/json-ld';
import RedirectPage from '@/components/RedirectPage';

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
  if (getPostsBasePath() !== 'posts') return [{ slug: '_' }]; // Route disabled; custom path handles this
  const posts = getAllPosts();

  // Include a post if its canonical URL is /posts/[slug] (normal render),
  // or if /posts/[slug] appears in its redirectFrom list (redirect page).
  const basePath = getPostsBasePath();
  const filtered = posts.filter(p => {
    const canonical = getPostUrl(p);
    if (canonical === `/${basePath}/${p.slug}`) return true;
    // autoPaths or customPaths moved this post — include only if it opts into a redirect here
    return (p.redirectFrom ?? []).includes(`/${basePath}/${p.slug}`);
  });

  const slugs = new Set<string>();
  for (const post of filtered) {
    slugs.add(post.slug);
    if (process.env.NODE_ENV !== 'production') {
      slugs.add(encodeURIComponent(post.slug));
    }
  }

  // Also include redirectFrom slugs at this basePath (e.g. /posts/old-name → /posts/new-name).
  for (const post of posts) {
    for (const from of post.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 2 || segments[0] !== basePath) continue;
      if (from === getPostUrl(post)) continue;
      const fromSlug = segments[1];
      slugs.add(fromSlug);
      if (process.env.NODE_ENV !== 'production') {
        slugs.add(encodeURIComponent(fromSlug));
      }
    }
  }

  if (slugs.size === 0) return [{ slug: '_' }];
  return Array.from(slugs).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = safeDecodeParam(rawSlug);
  const basePath = getPostsBasePath();
  const currentPath = `/${basePath}/${slug}`;
  const post =
    resolvePostFromParam(rawSlug) ??
    getAllPosts().find(p => p.redirectFrom?.includes(currentPath));

  if (!post) {
    return {
      title: 'Post Not Found',
    };
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

  const ogImage = resolveImageUrl(post.coverImage, siteConfig.ogImage, siteUrl);

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

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = safeDecodeParam(rawSlug);
  const basePath = getPostsBasePath();
  const currentPath = `/${basePath}/${slug}`;
  const post =
    resolvePostFromParam(rawSlug) ??
    getAllPosts().find(p => p.redirectFrom?.includes(currentPath));

  if (!post) {
    notFound();
  }

  // If the canonical URL differs from the current path, render a redirect page.
  // This handles posts moved by autoPaths or customPaths, or renamed within the same prefix.
  const canonicalUrl = getPostUrl(post);
  if (canonicalUrl !== currentPath) {
    return <RedirectPage to={canonicalUrl} />;
  }

  // Determine layout based on frontmatter
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

  const relatedPosts = getRelatedPosts(slug);
  const { prev, next } = getAdjacentPosts(slug);
  const slugRegistry = buildSlugRegistry();
  const backlinks = getBacklinks(slug);
  const collectionContexts = getCollectionsForPost(slug);
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
      <PostLayout post={post} relatedPosts={relatedPosts} seriesPosts={seriesPosts} seriesTitle={seriesTitle} collectionContexts={collectionContexts} prevPost={prev} nextPost={next} backlinks={backlinks} slugRegistry={slugRegistry} />
    </>
  );
}
