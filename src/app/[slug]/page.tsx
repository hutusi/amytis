import { getSeriesData, getSeriesPosts, resolveSeriesAuthors } from '@/lib/content/series';
import { getAuthorSlug } from '@/lib/content/authors';
import { getListingPosts } from '@/lib/content/posts';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import PostList from '@/components/PostList';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { Metadata } from 'next';
import { siteConfig } from '../../../site.config';
import { resolveLocale, t } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import { topLevelSlugParams, resolveTopLevelSlug } from '@/lib/route-aliases';
import RedirectPage from '@/components/RedirectPage';

const POST_PAGE_SIZE = siteConfig.pagination.posts;
const SERIES_PAGE_SIZE = siteConfig.pagination.series;

/**
 * Generates the static paths for all top-level pages at build time,
 * plus any custom URL prefixes configured for posts or series.
 * Alias collisions throw inside topLevelSlugParams (strict build).
 */
export async function generateStaticParams() {
  return topLevelSlugParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const resolution = resolveTopLevelSlug(rawSlug);

  switch (resolution?.kind) {
    case 'postsListing':
      return {
        title: `${t('posts')} | ${resolveLocale(siteConfig.title)}`,
        description: t('posts_description'),
      };
    case 'seriesListing': {
      const seriesData = getSeriesData(resolution.seriesSlug);
      if (seriesData) {
        return {
          title: `${seriesData.title} - ${t('series')} | ${resolveLocale(siteConfig.title)}`,
          description: seriesData.excerpt,
        };
      }
      return { title: 'Page Not Found' };
    }
    case 'page':
      return {
        title: `${resolution.page.title} | ${resolveLocale(siteConfig.title)}`,
        description: resolution.page.excerpt,
      };
    case 'redirect':
      return { title: resolution.post.title };
    default:
      return { title: 'Page Not Found' };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const resolution = resolveTopLevelSlug(rawSlug);
  if (!resolution) notFound();

  // Custom posts basePath listing (e.g. /articles)
  if (resolution.kind === 'postsListing') {
    const { basePath } = resolution;
    const allPosts = getListingPosts();
    const totalPages = Math.ceil(allPosts.length / POST_PAGE_SIZE);
    const posts = allPosts.slice(0, POST_PAGE_SIZE);

    return (
      <div className="layout-main">
        <PageHeader
          titleKey="posts"
          subtitleKey="posts_subtitle"
          subtitleParams={{ count: allPosts.length }}
          className="mb-12"
        />
        <PostList posts={posts} />
        {totalPages > 1 && (
          <div className="mt-12">
            <Pagination currentPage={1} totalPages={totalPages} basePath={`/${basePath}`} />
          </div>
        )}
      </div>
    );
  }

  // Series listing at a custom or auto path (e.g. /weeklies, /my-series)
  if (resolution.kind === 'seriesListing') {
    const matchedSeriesSlug = resolution.seriesSlug;
    const seriesData = getSeriesData(matchedSeriesSlug);
    const allPosts = getSeriesPosts(matchedSeriesSlug);

    if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
      notFound();
    }

    const totalPages = Math.ceil(allPosts.length / SERIES_PAGE_SIZE);
    const posts = allPosts.slice(0, SERIES_PAGE_SIZE);

    const title = seriesData?.title || matchedSeriesSlug.charAt(0).toUpperCase() + matchedSeriesSlug.slice(1);
    const description = seriesData?.excerpt;
    const coverImage = seriesData?.coverImage;
    const authors = resolveSeriesAuthors(matchedSeriesSlug, allPosts);

    return (
      <div className="layout-main">
        <header className="mb-16">
          {coverImage && (
            <div className="relative w-full h-56 md:h-72 mb-10 rounded-2xl overflow-hidden shadow-xl shadow-accent/5">
              <CoverImage
                src={coverImage}
                title={title}
                slug={matchedSeriesSlug}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          )}
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge-accent mb-4">
              {t('series')} • {allPosts.length} {t('parts')}
            </span>
            <h1 className="page-title mb-4">{title}</h1>
            {description && (
              <p className="text-lg text-muted font-serif italic leading-relaxed">{description}</p>
            )}
            {authors.length > 0 && (
              <p className="mt-4 text-sm text-muted">
                <span className="mr-1">{t('written_by')}</span>
                {authors.map((author, index) => (
                  <span key={author}>
                    <Link
                      href={`/authors/${getAuthorSlug(author)}`}
                      className="text-foreground hover:text-accent no-underline transition-colors duration-200"
                    >
                      {author}
                    </Link>
                    {index < authors.length - 1 && <span className="mr-1">,</span>}
                  </span>
                ))}
              </p>
            )}
          </div>
        </header>
        <SeriesCatalog posts={posts} totalPosts={allPosts.length} />
        {totalPages > 1 && (
          <div className="mt-12">
            <Pagination currentPage={1} totalPages={totalPages} basePath={`/${resolution.prefix}`} />
          </div>
        )}
      </div>
    );
  }

  // Single-segment redirectFrom — resolveTopLevelSlug only reports this when
  // no real page exists for the slug, so aliases can't hijack real pages.
  if (resolution.kind === 'redirect') {
    return <RedirectPage to={resolution.to} />;
  }

  // Default: static page
  const page = resolution.page;
  const layout = page.layout || 'simple';

  if (layout === 'post') {
    return <PostLayout post={page} commentCategory="staticPages" />;
  }

  return <SimpleLayout post={page} />;
}
