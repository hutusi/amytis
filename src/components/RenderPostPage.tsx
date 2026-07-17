import { buildSlugRegistry, getBacklinks } from '@/lib/content/discovery';
import { getRelatedPosts, getAdjacentPosts } from '@/lib/content/related';
import { getSeriesPosts, getSeriesData, getCollectionsForPost, toPostNavItems } from '@/lib/content/series';
import type { PostData, PostNavItem } from '@/lib/content/types';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import { siteConfig } from '../../site.config';
import { resolveLocale } from '@/lib/i18n';
import { getPostUrl, withTrailingSlash } from '@/lib/urls';
import { buildPostJsonLd, serializeJsonLd } from '@/lib/json-ld';

/**
 * Shared body for the two routes that render a canonical post —
 * /posts/[slug] and the prefixed [slug]/[postSlug] (series autoPaths /
 * customPaths). Callers resolve the post and handle redirect/notFound;
 * this component owns JSON-LD, the simple-layout branch, and the
 * related/adjacent/backlinks/series assembly.
 */
export default function RenderPostPage({ post }: { post: PostData }) {
  const layout = post.layout || 'post';

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const jsonLd = buildPostJsonLd({
    post,
    postUrl: withTrailingSlash(`${siteUrl}${getPostUrl(post)}`),
    siteTitle: resolveLocale(siteConfig.title),
    siteUrl,
    defaultOgImage: siteConfig.ogImage,
  });
  const jsonLdScript = (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
  );

  if (layout === 'simple') {
    return <>{jsonLdScript}<SimpleLayout post={post} /></>;
  }

  const relatedPosts = getRelatedPosts(post.slug);
  const { prev, next } = getAdjacentPosts(post.slug);
  const slugRegistry = buildSlugRegistry();
  const backlinks = getBacklinks(post.slug);
  const collectionContexts = getCollectionsForPost(post.slug);
  let seriesPosts: PostNavItem[] = [];
  let seriesTitle: string | undefined;

  if (post.series) {
    // Project to nav items so sibling article bodies stay out of the client payload.
    seriesPosts = toPostNavItems(getSeriesPosts(post.series));
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
