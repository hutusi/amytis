import { getSeriesData, getSeriesPosts, getCollectionPosts, resolveSeriesAuthors } from '@/lib/content/series';
import { getAuthorSlug } from '@/lib/content/authors';
import { notFound } from 'next/navigation';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../../site.config';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { t, resolveLocale, tWith } from '@/lib/i18n';
import { getSeriesListUrl } from '@/lib/urls';
import RedirectPage from '@/components/RedirectPage';
import { seriesPageParams, resolveSeriesParam } from '@/lib/route-aliases';
import { paginate } from '@/lib/pagination';

const PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  return seriesPageParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug: rawSlug, page } = await params;
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
    return {
      title: resolution.data.title,
      alternates: { canonical: `${siteUrl}${getSeriesListUrl()}/${resolution.canonicalSlug}/page/${page}` },
    };
  }
  const slug = resolution.slug;

  const seriesData = getSeriesData(slug);
  const title = seriesData?.title || slug;
  const allPosts = seriesData?.type === 'collection' ? getCollectionPosts(slug) : getSeriesPosts(slug);
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  return {
    title: `${title} - ${tWith('page_of_total', { page, total: totalPages })} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug: rawSlug, page: pageStr } = await params;
  const page = parseInt(pageStr);
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    return <RedirectPage to={`${getSeriesListUrl()}/${resolution.canonicalSlug}/page/${page}`} />;
  }
  const slug = resolution.slug;

  const seriesData = getSeriesData(slug);
  const isCollection = seriesData?.type === 'collection';
  const allPosts = isCollection ? getCollectionPosts(slug) : getSeriesPosts(slug);

  if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
    notFound();
  }

  const slice = paginate(allPosts, page, PAGE_SIZE);
  if (!slice || page < 2) notFound();
  const { items: posts, totalPages, start } = slice;

  // Fallback title
  const title = seriesData?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
  const description = seriesData?.excerpt;
  const coverImage = seriesData?.coverImage;

  const authors = resolveSeriesAuthors(slug, allPosts);


  return (
    <div className="layout-main">
      <header className="mb-16">
        {/* Cover image hero */}
        {coverImage && (
          <div className="relative w-full h-56 md:h-72 mb-10 rounded-2xl overflow-hidden shadow-xl shadow-accent/5">
            <CoverImage
              src={coverImage}
              title={title}
              slug={slug}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
        )}

        <div className="text-center max-w-2xl mx-auto">
          <span className="badge-accent mb-4">
            {isCollection ? t('collection') : t('series')} • {allPosts.length} {t('parts')}
          </span>
          <h1 className="page-title mb-2">{title}</h1>
          <p className="text-base text-muted font-sans mt-1 mb-4">{tWith('page_of_total', { page, total: totalPages })}</p>
          {description && (
            <p className="text-lg text-muted font-serif italic leading-relaxed">
              {description}
            </p>
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

      {/* Series Catalog */}
      <SeriesCatalog posts={posts} startIndex={start} totalPosts={allPosts.length} collectionSlug={isCollection ? slug : undefined} />

      <div className="mt-12">
        <Pagination currentPage={page} totalPages={totalPages} basePath={getSeriesListUrl() + `/${slug}`} />
      </div>
    </div>
  );
}
