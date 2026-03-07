import { getPageBySlug, getAllPages, getListingPosts, getSeriesData, getSeriesPosts, getSeriesAuthors, getAuthorSlug } from '@/lib/markdown';
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
import { getPostsBasePath, getSeriesCustomPaths } from '@/lib/urls';

const POST_PAGE_SIZE = siteConfig.pagination.posts;
const SERIES_PAGE_SIZE = siteConfig.pagination.series;

/**
 * Generates the static paths for all top-level pages at build time,
 * plus any custom URL prefixes configured for posts or series.
 */
export async function generateStaticParams() {
  const pages = getAllPages();
  const params = pages.map((page) => ({ slug: page.slug }));

  // Add custom posts basePath listing (e.g. /articles)
  const basePath = getPostsBasePath();
  if (basePath !== 'posts') {
    params.push({ slug: basePath });
  }

  // Add series custom path listings (e.g. /weeklies)
  for (const customPath of Object.values(getSeriesCustomPaths())) {
    params.push({ slug: customPath });
  }

  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  // Custom posts basePath
  const basePath = getPostsBasePath();
  if (slug === basePath && basePath !== 'posts') {
    return {
      title: `${t('posts')} | ${resolveLocale(siteConfig.title)}`,
      description: t('posts_description'),
    };
  }

  // Series custom paths
  const customPaths = getSeriesCustomPaths();
  const matchedSeriesSlug = Object.entries(customPaths).find(([, path]) => path === slug)?.[0];
  if (matchedSeriesSlug) {
    const seriesData = getSeriesData(matchedSeriesSlug);
    if (seriesData) {
      return {
        title: `${seriesData.title} - ${t('series')} | ${resolveLocale(siteConfig.title)}`,
        description: seriesData.excerpt,
      };
    }
  }

  const page = getPageBySlug(slug);
  if (!page) {
    return { title: 'Page Not Found' };
  }

  return {
    title: `${page.title} | ${resolveLocale(siteConfig.title)}`,
    description: page.excerpt,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);

  // Check if slug matches custom posts basePath
  const basePath = getPostsBasePath();
  if (slug === basePath && basePath !== 'posts') {
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

  // Check if slug matches a series custom path
  const customPaths = getSeriesCustomPaths();
  const matchedSeriesSlug = Object.entries(customPaths).find(([, path]) => path === slug)?.[0];
  if (matchedSeriesSlug) {
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

    const explicitAuthors = getSeriesAuthors(matchedSeriesSlug);
    let authors: string[];
    if (explicitAuthors) {
      authors = explicitAuthors;
    } else if (allPosts.length > 0) {
      const counts = new Map<string, number>();
      for (const post of allPosts) {
        for (const author of post.authors) {
          counts.set(author, (counts.get(author) || 0) + 1);
        }
      }
      authors = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    } else {
      authors = [];
    }

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
            <Pagination currentPage={1} totalPages={totalPages} basePath={`/${slug}`} />
          </div>
        )}
      </div>
    );
  }

  // Default: static page
  const page = getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  // Determine layout based on frontmatter, defaulting to 'simple' for pages
  const layout = page.layout || 'simple';

  if (layout === 'post') {
    return <PostLayout post={page} commentCategory="staticPages" />;
  }

  return <SimpleLayout post={page} />;
}
