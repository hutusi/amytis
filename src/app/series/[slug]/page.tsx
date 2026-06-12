import { getSeriesData, getSeriesPosts, getCollectionPosts, resolveSeriesAuthors } from '@/lib/content/series';
import { getAuthorSlug } from '@/lib/content/authors';
import { notFound } from 'next/navigation';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { t, resolveLocale } from '@/lib/i18n';
import { getPostUrl, getPostUrlInCollection, getSeriesUrl } from '@/lib/urls';
import RedirectPage from '@/components/RedirectPage';
import { seriesSlugParams, resolveSeriesParam } from '@/lib/route-aliases';

const PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  return seriesSlugParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
    return {
      title: resolution.data.title,
      alternates: { canonical: `${siteUrl}${getSeriesUrl(resolution.canonicalSlug)}` },
    };
  }
  const slug = resolution.slug;

  const seriesData = getSeriesData(slug);

  if (!seriesData) {
    // If no explicit series metadata, try to infer from posts or return default
    const posts = getSeriesPosts(slug);
    if (posts.length > 0) {
        return {
            title: `${slug} - ${t('series')} | ${resolveLocale(siteConfig.title)}`,
            description: `${posts.length} ${t('posts').toLowerCase()} - ${slug}.`,
        }
    }
    return { title: 'Series Not Found' };
  }

  const ogImage = seriesData.coverImage && !seriesData.coverImage.startsWith('text:') && !seriesData.coverImage.startsWith('./')
    ? seriesData.coverImage
    : siteConfig.ogImage;

  return {
    title: `${seriesData.title} - ${t('series')} | ${resolveLocale(siteConfig.title)}`,
    description: seriesData.excerpt,
    openGraph: {
      title: seriesData.title,
      description: seriesData.excerpt,
      type: 'website',
      url: `${siteConfig.baseUrl}${getSeriesUrl(slug)}`,
      siteName: resolveLocale(siteConfig.title),
      images: [{ url: ogImage, width: 1200, height: 630, alt: seriesData.title }],
    },
    twitter: {
      card: ogImage !== siteConfig.ogImage ? 'summary_large_image' : 'summary',
      title: seriesData.title,
      description: seriesData.excerpt,
      images: [ogImage],
    },
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    return <RedirectPage to={getSeriesUrl(resolution.canonicalSlug)} />;
  }
  const slug = resolution.slug;

  const seriesData = getSeriesData(slug);
  const isCollection = seriesData?.type === 'collection';
  const allPosts = isCollection ? getCollectionPosts(slug) : getSeriesPosts(slug);

  if ((!seriesData && allPosts.length === 0) || (process.env.NODE_ENV === 'production' && seriesData?.draft)) {
    notFound();
  }

  const page = 1;
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  const posts = allPosts.slice(0, PAGE_SIZE);

  // Fallback title if seriesData not found (e.g. no index.md but posts exist via frontmatter)
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
          <h1 className="page-title mb-4">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-muted font-serif italic leading-relaxed">
              {description}
            </p>
          )}
          {allPosts.length > 0 && (() => {
            // Pick the first installment respecting sort order:
            // date-desc (default) → oldest is last; date-asc/manual → oldest/first is [0]
            const firstPost = (seriesData?.sort === 'date-asc' || seriesData?.sort === 'manual' || isCollection)
              ? allPosts[0]
              : allPosts[allPosts.length - 1];
            const primaryHref = isCollection ? getPostUrlInCollection(firstPost, slug) : getPostUrl(firstPost);
            // primaryHref already carries `?collection=<slug>` for collection
            // contexts (see getPostUrlInCollection), so naïvely appending
            // `?immersive=1` would produce an invalid double-`?` URL and the
            // flag handler would never fire. Use the right separator.
            const immersiveHref = `${primaryHref}${primaryHref.includes('?') ? '&' : '?'}immersive=1`;
            return (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={primaryHref}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors no-underline"
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-ink/[0.10] text-foreground/80 hover:text-accent hover:border-accent/50 rounded-full text-sm font-medium no-underline transition-colors"
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
      <SeriesCatalog posts={posts} totalPosts={allPosts.length} collectionSlug={isCollection ? slug : undefined} />

      {totalPages > 1 && (
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath={getSeriesUrl(slug)} />
        </div>
      )}
    </div>
  );
}
