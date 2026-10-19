import { resolveFromParam, safeDecodeParam, withDevEncodedVariants } from '@/lib/route-params';
import { getPostBySlug, getAllPosts, getPostContentLocales } from '@/lib/content/posts';
import { contentSeoUrls } from '@/lib/locale-routes';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { getPostsBasePath, getPostUrl } from '@/lib/urls';
import { resolveImageUrl } from '@/lib/json-ld';
import { buildRedirectMetadata, buildArticleMetadata } from '@/lib/metadata';
import RedirectPage from '@/components/RedirectPage';
import { postsAcrossTrees } from '@/lib/route-aliases';
import RenderPostPage from '@/components/RenderPostPage';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

function resolvePostFromParam(rawSlug: string) {
  return resolveFromParam(rawSlug, (candidate) => getPostBySlug(candidate));
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
  }

  // Also include redirectFrom slugs at this basePath (e.g. /posts/old-name → /posts/new-name).
  // Scans every locale tree: migrated content keeps its old /posts/ URL as a redirect.
  for (const post of postsAcrossTrees()) {
    for (const from of post.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      if (segments.length !== 2 || segments[0] !== basePath) continue;
      if (from === getPostUrl(post)) continue;
      slugs.add(segments[1]);
    }
  }

  const params = withDevEncodedVariants(Array.from(slugs).map((slug) => ({ slug })));
  return params.length > 0 ? params : [{ slug: '_' }];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = safeDecodeParam(rawSlug);
  const basePath = getPostsBasePath();
  const currentPath = `/${basePath}/${slug}`;
  const post =
    resolvePostFromParam(rawSlug) ??
    postsAcrossTrees().find(p => p.redirectFrom?.includes(currentPath));

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const canonicalUrl = getPostUrl(post);

  // For redirect pages, return minimal metadata pointing to the canonical URL
  if (canonicalUrl !== currentPath) {
    return buildRedirectMetadata({ title: post.title, to: canonicalUrl });
  }

  // Twins canonicalize to the unprefixed URL with reciprocal hreflang;
  // single-locale posts keep their plain self-canonical (byte-identical).
  const seo = contentSeoUrls(canonicalUrl, getPostContentLocales(post));
  return buildArticleMetadata({
    locale: DEFAULT_LOCALE,
    title: post.title,
    description: post.excerpt,
    publishedTime: post.date,
    authors: post.authors,
    canonicalUrl: seo.canonicalUrl,
    languageAlternates: seo.languageAlternates,
    ogImage: resolveImageUrl(post.coverImage, siteConfig.ogImage, siteUrl),
    twitterCard: 'summary_large_image',
  });
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
    postsAcrossTrees().find(p => p.redirectFrom?.includes(currentPath));

  if (!post) {
    notFound();
  }

  // If the canonical URL differs from the current path, render a redirect page.
  // This handles posts moved by autoPaths or customPaths, or renamed within the same prefix.
  const canonicalUrl = getPostUrl(post);
  if (canonicalUrl !== currentPath) {
    return <RedirectPage to={canonicalUrl} />;
  }

  return <RenderPostPage post={post} locale={DEFAULT_LOCALE} />;
}
