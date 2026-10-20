import { getSeriesData, getSeriesPosts, resolveSeriesAuthors } from '@/lib/content/series';
import { getAuthorSlug } from '@/lib/content/authors';
import { notFound } from 'next/navigation';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { getTranslator } from '@/lib/i18n';
import { localizeUrl } from '@/lib/urls';
import { firstPage, paginate } from '@/lib/pagination';
import { siteConfig } from '../../../site.config';

const PAGE_SIZE = siteConfig.pagination.series;

interface SeriesPrefixListingBodyProps {
  locale: string;
  seriesSlug: string;
  /** URL prefix the listing lives at (custom or auto path), without slashes. */
  prefix: string;
  page: number;
}

/**
 * Shared body for a series listing served at a custom or auto top-level
 * prefix (e.g. `/weeklies`, `/my-series`). Rendered by the `seriesListing`
 * branches of `/[slug]` + `/[slug]/page/[page]` and the locale-prefixed trees.
 * Unlike SeriesLandingBody (`/series/<slug>`), this surface has no
 * collection handling and no start-reading CTAs.
 */
export default function SeriesPrefixListingBody({ locale, seriesSlug, prefix, page }: SeriesPrefixListingBodyProps) {
  const { t } = getTranslator(locale);
  const seriesData = getSeriesData(seriesSlug, locale);
  const allPosts = getSeriesPosts(seriesSlug, locale);

  if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
    notFound();
  }

  const slice = page === 1 ? firstPage(allPosts, PAGE_SIZE) : paginate(allPosts, page, PAGE_SIZE);
  if (!slice) notFound();
  const { items: posts, totalPages, start } = slice;

  const title = seriesData?.title || seriesSlug.charAt(0).toUpperCase() + seriesSlug.slice(1);
  const description = seriesData?.excerpt;
  const coverImage = seriesData?.coverImage;
  const authors = resolveSeriesAuthors(seriesSlug, allPosts, locale);

  return (
    <div className="layout-main">
      <header className="mb-16">
        {coverImage && (
          <div className="relative w-full h-56 md:h-72 mb-10 rounded-2xl overflow-hidden shadow-xl shadow-accent/5">
            <CoverImage
              src={coverImage}
              title={title}
              slug={seriesSlug}
              className="w-full h-full object-cover"
              sizes="(min-width: 1200px) 1104px, 100vw"
              // Above-the-fold hero: the page's LCP image.
              loading="eager"
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
            {page > 1 && (
              <span className="block text-lg text-muted font-sans font-normal mt-2">
                {page} / {totalPages}
              </span>
            )}
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
      <SeriesCatalog posts={posts} locale={locale} startIndex={start} totalPosts={allPosts.length} />
      {(page > 1 || totalPages > 1) && (
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath={localizeUrl(`/${prefix}`, locale)} />
        </div>
      )}
    </div>
  );
}
