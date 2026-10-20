import { getSeriesData, getSeriesPosts, getCollectionPosts, resolveSeriesAuthors } from '@/lib/content/series';
import { getAuthorSlug } from '@/lib/content/authors';
import { notFound } from 'next/navigation';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { getTranslator } from '@/lib/i18n';
import { getPostUrl, getPostUrlInCollection, getSeriesUrl, localizeUrl } from '@/lib/urls';
import { firstPage, paginate } from '@/lib/pagination';
import { siteConfig } from '../../../site.config';

const PAGE_SIZE = siteConfig.pagination.series;

interface SeriesLandingBodyProps {
  locale: string;
  seriesSlug: string;
  page: number;
}

/**
 * Shared body for the canonical series landing page (`/series/<slug>`),
 * page 1 and page N. Handles collections and, on page 1, the
 * start-reading / immersive CTAs — the custom-prefix listing surface
 * (SeriesPrefixListingBody) deliberately has neither.
 */
export default function SeriesLandingBody({ locale, seriesSlug, page }: SeriesLandingBodyProps) {
  const { t, tWith } = getTranslator(locale);
  const seriesData = getSeriesData(seriesSlug, locale);
  const isCollection = seriesData?.type === 'collection';
  const allPosts = isCollection ? getCollectionPosts(seriesSlug, locale) : getSeriesPosts(seriesSlug, locale);

  if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
    notFound();
  }

  const slice = page === 1 ? firstPage(allPosts, PAGE_SIZE) : paginate(allPosts, page, PAGE_SIZE);
  if (!slice) notFound();
  const { items: posts, totalPages, start } = slice;

  // Fallback title if seriesData not found (e.g. no index.md but posts exist via frontmatter)
  const title = seriesData?.title || seriesSlug.charAt(0).toUpperCase() + seriesSlug.slice(1);
  const description = seriesData?.excerpt;
  const coverImage = seriesData?.coverImage;
  const authors = resolveSeriesAuthors(seriesSlug, allPosts, locale);

  return (
    <div className="layout-main">
      {/* Only page 1 is indexed: later pages repeat the same header. */}
      <header {...(page === 1 ? { 'data-pagefind-body': '', 'data-pagefind-filter': 'type:Post' } : {})} className="mb-16">
        {/* Cover image hero */}
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
          <span data-pagefind-ignore className="badge-accent mb-4">
            {isCollection ? t('collection') : t('series')} • {allPosts.length} {t('parts')}
          </span>
          {page === 1 ? (
            <h1 data-pagefind-meta="title" className="page-title mb-4">{title}</h1>
          ) : (
            <>
              <h1 className="page-title mb-2">{title}</h1>
              <p className="text-base text-muted font-sans mt-1 mb-4">{tWith('page_of_total', { page, total: totalPages })}</p>
            </>
          )}
          {description && (
            <p className="text-lg text-muted font-serif italic leading-relaxed">
              {description}
            </p>
          )}
          {page === 1 && allPosts.length > 0 && (() => {
            // Pick the first installment respecting sort order:
            // date-desc (default) → oldest is last; date-asc/manual → oldest/first is [0]
            const firstPost = (seriesData?.sort === 'date-asc' || seriesData?.sort === 'manual' || isCollection)
              ? allPosts[0]
              : allPosts[allPosts.length - 1];
            const primaryHref = isCollection ? getPostUrlInCollection(firstPost, seriesSlug) : getPostUrl(firstPost);
            // primaryHref already carries `?collection=<slug>` for collection
            // contexts (see getPostUrlInCollection), so naïvely appending
            // `?immersive=1` would produce an invalid double-`?` URL and the
            // flag handler would never fire. Use the right separator.
            const immersiveHref = `${primaryHref}${primaryHref.includes('?') ? '&' : '?'}immersive=1`;
            return (
              <div data-pagefind-ignore className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-contrast text-sm font-medium hover:bg-accent/90 transition-colors no-underline"
                >
                  {t('start_reading')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
                {/* Secondary CTA — opens the first post of the series in immersive mode.
                    The `?immersive=1` query param is read by ImmersiveReadingProvider
                    on mount, which calls enter() then strips the flag from the URL
                    so back-navigation doesn't re-trigger it. */}
                <Link
                  href={immersiveHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-line-strong text-foreground/80 hover:text-accent hover:border-accent/50 rounded-full text-sm font-medium no-underline transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  </svg>
                  {t('immersive_reading')}
                </Link>
              </div>
            );
          })()}
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
      <SeriesCatalog posts={posts} locale={locale} startIndex={start} totalPosts={allPosts.length} collectionSlug={isCollection ? seriesSlug : undefined} />

      {(page > 1 || totalPages > 1) && (
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath={localizeUrl(getSeriesUrl(seriesSlug), locale)} />
        </div>
      )}
    </div>
  );
}
