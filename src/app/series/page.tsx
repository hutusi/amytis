import { getAllSeries, getSeriesData } from '@/lib/markdown';
import Link from 'next/link';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Series | ${siteConfig.title}`,
  description: 'Curated collections of articles and thoughts.',
};

export default function SeriesIndexPage() {
  const allSeries = getAllSeries();
  const seriesSlugs = Object.keys(allSeries).sort();

  return (
    <div className="layout-main">
      <header className="page-header">
        <h1 className="page-title">
          All Series
        </h1>
        <p className="page-subtitle">
          Curated collections of knowledge.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {seriesSlugs.map(slug => {
          const posts = allSeries[slug];
          const seriesData = getSeriesData(slug);
          const title = seriesData?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
          const description = seriesData?.excerpt || `${posts.length} articles in this collection.`;

          return (
            <Link key={slug} href={`/series/${slug}`} className="group block no-underline">
              <div className="card-base h-full group">
                <span className="badge-accent">
                  {posts.length} Posts
                </span>
                <h2 className="mb-4 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors">
                  {title}
                </h2>
                <p className="text-muted font-serif italic leading-relaxed line-clamp-3">
                  {description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
