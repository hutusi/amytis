import { getSeriesData, getSeriesPosts, getAllSeries, getSeriesAuthors, getAuthorSlug } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../../site.config';
import CoverImage from '@/components/CoverImage';
import Link from 'next/link';
import { t } from '@/lib/i18n';

const PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  const allSeries = getAllSeries();
  const params: { slug: string; page: string }[] = [];
  
  Object.keys(allSeries).forEach(slug => {
    const posts = allSeries[slug];
    const totalPages = Math.ceil(posts.length / PAGE_SIZE);
    if (totalPages > 1) {
        for (let i = 2; i <= totalPages; i++) {
            params.push({ slug: encodeURIComponent(slug), page: i.toString() });
        }
    }
  });
  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug: rawSlug, page } = await params;
  const slug = decodeURIComponent(rawSlug);
  const seriesData = getSeriesData(slug);
  const title = seriesData?.title || slug;
  return {
    title: `${title} - ${page} | ${siteConfig.title}`,
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug: rawSlug, page: pageStr } = await params;
  const slug = decodeURIComponent(rawSlug);
  const page = parseInt(pageStr);
  const seriesData = getSeriesData(slug);
  const allPosts = getSeriesPosts(slug);

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

  // Use explicitly configured series authors, or aggregate top authors from posts
  const explicitAuthors = getSeriesAuthors(slug);
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
    authors = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  } else {
    authors = [];
  }

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
            {t('series')} • {allPosts.length} {t('parts')}
          </span>
          <h1 className="page-title mb-4">
            {title}
            <span className="block text-lg text-muted font-sans font-normal mt-2">{page} / {totalPages}</span>
          </h1>
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
      <SeriesCatalog posts={posts} startIndex={startIndex} totalPosts={allPosts.length} />

      <div className="mt-12">
        <Pagination currentPage={page} totalPages={totalPages} basePath={`/series/${slug}`} />
      </div>
    </div>
  );
}
