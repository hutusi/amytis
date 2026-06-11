import { getSeriesData, getSeriesPosts, resolveSeriesAuthors } from '@/lib/content/series';
import { getAuthorSlug } from '@/lib/content/authors';
import { getListingPosts } from '@/lib/content/posts';
import PostList from '@/components/PostList';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { getPostsBasePath } from '@/lib/urls';
import { prefixedPageParams, resolveSeriesListingPrefix } from '@/lib/route-aliases';
import { paginate } from '@/lib/pagination';

const POST_PAGE_SIZE = siteConfig.pagination.posts;
const SERIES_PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  return prefixedPageParams();
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}): Promise<Metadata> {
  const { slug: prefix, page } = await params;
  const basePath = getPostsBasePath();
  const matchedSeriesSlug = resolveSeriesListingPrefix(prefix);

  if (prefix === basePath && basePath !== 'posts') {
    return {
      title: `${t('posts')} - ${page} | ${resolveLocale(siteConfig.title)}`,
    };
  }

  if (matchedSeriesSlug) {
    const seriesData = getSeriesData(matchedSeriesSlug);
    const title = seriesData?.title || matchedSeriesSlug;
    return {
      title: `${title} - ${page} | ${resolveLocale(siteConfig.title)}`,
    };
  }

  return { title: 'Not Found' };
}

export default async function PrefixPageRoute({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug: prefix, page: pageStr } = await params;
  const page = parseInt(pageStr, 10);

  if (isNaN(page) || page < 2) notFound();

  const basePath = getPostsBasePath();
  const matchedSeriesSlug = resolveSeriesListingPrefix(prefix);

  // Custom posts basePath listing
  if (prefix === basePath && basePath !== 'posts') {
    const slice = paginate(getListingPosts(), page, POST_PAGE_SIZE);
    if (!slice) notFound();
    const { items: posts, totalPages } = slice;

    return (
      <div className="layout-main">
        <PageHeader
          titleKey="posts"
          subtitleKey="page_of_total"
          subtitleParams={{ page, total: totalPages }}
          className="mb-12"
        />
        <PostList posts={posts} />
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath={`/${basePath}`} />
        </div>
      </div>
    );
  }

  // Series custom path listing
  if (matchedSeriesSlug) {
    const seriesData = getSeriesData(matchedSeriesSlug);
    const allPosts = getSeriesPosts(matchedSeriesSlug);

    if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
      notFound();
    }

    const slice = paginate(allPosts, page, SERIES_PAGE_SIZE);
    if (!slice) notFound();
    const { items: posts, totalPages, start } = slice;

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
            <h1 className="page-title mb-4">
              {title}
              <span className="block text-lg text-muted font-sans font-normal mt-2">
                {page} / {totalPages}
              </span>
            </h1>
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
        <SeriesCatalog posts={posts} startIndex={start} totalPosts={allPosts.length} />
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath={`/${prefix}`} />
        </div>
      </div>
    );
  }

  notFound();
}
