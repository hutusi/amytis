import { getSeriesData, getSeriesPosts, getAllSeries } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import SeriesCatalog from '@/components/SeriesCatalog';
import Pagination from '@/components/Pagination';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import CoverImage from '@/components/CoverImage';

const PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  const allSeries = getAllSeries();
  return Object.keys(allSeries).map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const seriesData = getSeriesData(slug);
  
  if (!seriesData) {
    // If no explicit series metadata, try to infer from posts or return default
    const posts = getSeriesPosts(slug);
    if (posts.length > 0) {
        return {
            title: `${slug} - Series | ${siteConfig.title}`,
            description: `A collection of ${posts.length} posts about ${slug}.`,
        }
    }
    return { title: 'Series Not Found' };
  }

  return {
    title: `${seriesData.title} - Series | ${siteConfig.title}`,
    description: seriesData.excerpt,
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const seriesData = getSeriesData(slug);
  const allPosts = getSeriesPosts(slug);

  if (!seriesData && allPosts.length === 0) {
    notFound();
  }

  const page = 1;
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  const posts = allPosts.slice(0, PAGE_SIZE);

  // Fallback title if seriesData not found (e.g. no index.md but posts exist via frontmatter)
  const title = seriesData?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
  const description = seriesData?.excerpt;
  const coverImage = seriesData?.coverImage;

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
            Series • {allPosts.length} {allPosts.length === 1 ? 'Part' : 'Parts'}
          </span>
          <h1 className="page-title mb-4">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-muted font-serif italic leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </header>

      {/* Series Catalog */}
      <SeriesCatalog posts={posts} />

      {totalPages > 1 && (
        <div className="mt-12">
          <Pagination currentPage={page} totalPages={totalPages} basePath={`/series/${slug}`} />
        </div>
      )}
    </div>
  );
}