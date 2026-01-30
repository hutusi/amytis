import { getSeriesData, getSeriesPosts, getAllSeries } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import PostCard from '@/components/PostCard';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';

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
  const posts = getSeriesPosts(slug);

  if (!seriesData && posts.length === 0) {
    notFound();
  }

  // Fallback title if seriesData not found (e.g. no index.md but posts exist via frontmatter)
  const title = seriesData?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
  const description = seriesData?.excerpt;

  return (
    <div className="layout-main">
      <header className="page-header">
        <span className="badge-accent">
          Series
        </span>
        <h1 className="page-title">
          {title}
        </h1>
        {description && (
          <p className="page-subtitle">
            {description}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map(post => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
