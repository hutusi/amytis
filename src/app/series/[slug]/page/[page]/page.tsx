import { getSeriesData, getSeriesPosts, getCollectionPosts, getAllSeries, resolveSeriesAuthors, getAuthorSlug } from '@/lib/markdown';
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
import { findSeriesByRedirectFrom, safeDecodeParam } from '@/lib/series-redirects';

const PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  const allSeries = getAllSeries();
  const seriesBasePath = getSeriesListUrl();
  const seen = new Set<string>();
  const reservedSlugs = new Set(Object.keys(allSeries));
  const claimedAliases = new Map<string, string>();
  const params: { slug: string; page: string }[] = [];
  const pushParam = (slug: string, page: string) => {
    const key = `${slug}:${page}`;
    if (seen.has(key)) return;
    seen.add(key);
    params.push({ slug, page });
  };

  Object.keys(allSeries).forEach(slug => {
    const posts = allSeries[slug];
    const totalPages = Math.ceil(posts.length / PAGE_SIZE);
    if (totalPages > 1) {
      for (let i = 2; i <= totalPages; i++) {
        pushParam(slug, i.toString());
      }
    }

    const data = getSeriesData(slug);
    for (const from of data?.redirectFrom ?? []) {
      const segments = from.split('/').filter(Boolean);
      const expectedBase = seriesBasePath.replace(/^\/+|\/+$/g, '');
      if (segments.length !== 2 || segments[0] !== expectedBase) continue;
      const aliasSlug = segments[1];
      if (aliasSlug === slug || totalPages <= 1) continue;
      const claimedBy = claimedAliases.get(aliasSlug);
      if (claimedBy && claimedBy !== slug) {
        throw new Error(
          `[amytis] series redirectFrom alias "${from}" is claimed by both "${claimedBy}" and "${slug}".`
        );
      }
      if (!claimedBy && reservedSlugs.has(aliasSlug)) {
        throw new Error(
          `[amytis] series redirectFrom alias "${from}" for "${slug}" conflicts with an existing series slug.`
        );
      }
      claimedAliases.set(aliasSlug, slug);
      reservedSlugs.add(aliasSlug);
      for (let i = 2; i <= totalPages; i++) {
        pushParam(aliasSlug, i.toString());
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const encodedParams = params
      .filter(param => encodeURIComponent(param.slug) !== param.slug)
      .map(param => ({ ...param, slug: encodeURIComponent(param.slug) }))
      .filter(param => {
        const key = `${param.slug}:${param.page}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    params.push(...encodedParams);
  }

  if (params.length === 0) return [{ slug: '_', page: '2' }];
  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug: rawSlug, page } = await params;
  const slug = safeDecodeParam(rawSlug);
  const currentPath = `${getSeriesListUrl()}/${slug}`;
  const redirect = findSeriesByRedirectFrom(currentPath);
  if (redirect) {
    const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
    return {
      title: redirect.data.title,
      alternates: { canonical: `${siteUrl}${getSeriesListUrl()}/${redirect.slug}/page/${page}` },
    };
  }

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
  const slug = safeDecodeParam(rawSlug);
  const page = parseInt(pageStr);
  const currentPath = `${getSeriesListUrl()}/${slug}`;
  const redirect = findSeriesByRedirectFrom(currentPath);
  if (redirect) {
    return <RedirectPage to={`${getSeriesListUrl()}/${redirect.slug}/page/${page}`} />;
  }

  const seriesData = getSeriesData(slug);
  const isCollection = seriesData?.type === 'collection';
  const allPosts = isCollection ? getCollectionPosts(slug) : getSeriesPosts(slug);

  if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
    notFound();
  }

  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const posts = allPosts.slice(start, end);

  // Fallback title
  const title = seriesData?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
  const description = seriesData?.excerpt;
  const coverImage = seriesData?.coverImage;

  const authors = resolveSeriesAuthors(slug, allPosts);

  // Calculate the starting index for this page
  const startIndex = (page - 1) * PAGE_SIZE;

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
      <SeriesCatalog posts={posts} startIndex={startIndex} totalPosts={allPosts.length} collectionSlug={isCollection ? slug : undefined} />

      <div className="mt-12">
        <Pagination currentPage={page} totalPages={totalPages} basePath={`/series/${slug}`} />
      </div>
    </div>
  );
}
