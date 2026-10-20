import { buildSlugRegistry, getBacklinks } from '@/lib/content/discovery';
import { getRelatedPosts, getAdjacentPosts } from '@/lib/content/related';
import { getSeriesPosts, getSeriesData, getCollectionsForPost, toPostNavItems } from '@/lib/content/series';
import type { PostData, PostNavItem } from '@/lib/content/types';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { siteConfig } from '../../site.config';
import { resolveLocaleValue } from '@/lib/i18n';
import { getPostUrl, withTrailingSlash } from '@/lib/urls';
import { buildPostJsonLd, serializeJsonLd } from '@/lib/json-ld';
import { getPostBreadcrumbs } from '@/lib/breadcrumbs';

/**
 * Shared body for the two routes that render a canonical post —
 * /posts/[slug] and the prefixed [slug]/[postSlug] (series autoPaths /
 * customPaths). Callers resolve the post and handle redirect/notFound;
 * this component owns JSON-LD, the simple-layout branch, and the
 * related/adjacent/backlinks/series assembly.
 */
export default function RenderPostPage({ post, locale }: { post: PostData; locale: string }) {
  const layout = post.layout || 'post';
  const seriesTitle = post.series ? getSeriesData(post.series, post.locale)?.title : undefined;
  // One trail for the page and its JSON-LD. Simple-layout posts read like
  // static pages and get none.
  const breadcrumbs = layout === 'post' ? getPostBreadcrumbs(post, seriesTitle, locale) : [];

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const jsonLd = buildPostJsonLd({
    post,
    postUrl: withTrailingSlash(`${siteUrl}${getPostUrl(post)}`),
    siteTitle: resolveLocaleValue(siteConfig.title, locale),
    siteUrl,
    defaultOgImage: siteConfig.ogImage,
    inLanguage: post.locale,
    breadcrumbs,
  });
  const jsonLdScript = (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
  );

  if (layout === 'simple') {
    return <>{jsonLdScript}<SimpleLayout post={post} /></>;
  }

  const relatedPosts = getRelatedPosts(post);
  const { prev, next } = getAdjacentPosts(post);
  const slugRegistry = buildSlugRegistry(post.locale);
  const backlinks = getBacklinks(post.slug, post.locale);
  const collectionContexts = getCollectionsForPost(post);
  // Project to nav items so sibling article bodies stay out of the client payload.
  const seriesPosts: PostNavItem[] = post.series ? toPostNavItems(getSeriesPosts(post.series, post.locale)) : [];

  return (
    <>
      {jsonLdScript}
      <PostLayout
        post={post}
        locale={locale}
        relatedPosts={relatedPosts}
        seriesPosts={seriesPosts}
        seriesTitle={seriesTitle}
        collectionContexts={collectionContexts}
        prevPost={prev}
        nextPost={next}
        backlinks={backlinks}
        slugRegistry={slugRegistry}
        breadcrumbs={breadcrumbs}
      />
    </>
  );
}
