import { getAllSeries, getSeriesData, getSeriesAuthors } from '@/lib/markdown';
import Link from 'next/link';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import CoverImage from '@/components/CoverImage';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';

export const metadata: Metadata = {
  title: `${t('series')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Curated collections of articles and thoughts.',
};

export default function SeriesIndexPage() {
  const allSeries = getAllSeries();

  // Sort by most recent post date (active series first)
  const seriesSlugs = Object.keys(allSeries).sort((a, b) => {
    const latestA = allSeries[a][0]?.date || '';
    const latestB = allSeries[b][0]?.date || '';
    return latestB.localeCompare(latestA);
  });

  const totalSeries = seriesSlugs.length;

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="series"
        subtitleKey="series_subtitle"
        subtitleOneKey="series_subtitle_one"
        count={totalSeries}
        subtitleParams={{ count: totalSeries }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {seriesSlugs.map(slug => {
          const posts = allSeries[slug];
          const seriesData = getSeriesData(slug);
          const title = seriesData?.title || slug.charAt(0).toUpperCase() + slug.slice(1);
          const description = seriesData?.excerpt || `${posts.length} articles in this collection.`;

          // Resolve authors: explicit series authors, then aggregate from posts
          const explicitAuthors = getSeriesAuthors(slug);
          let authors: string[];
          if (explicitAuthors) {
            authors = explicitAuthors;
          } else if (posts.length > 0) {
            const counts = new Map<string, number>();
            for (const post of posts) {
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

          return (
            <Link key={slug} href={`/series/${slug}`} className="group block no-underline">
              <div className="card-base h-full group flex flex-col p-0 overflow-hidden">
                <div className="relative h-48 w-full overflow-hidden bg-muted/10">
                  <CoverImage
                    src={seriesData?.coverImage}
                    title={title}
                    slug={slug}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-8">
                  <span className="badge-accent mb-4 inline-block">
                    {posts.length} {t('posts')}
                  </span>
                  <h2 className="mb-3 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors">
                    {title}
                  </h2>
                  {authors.length > 0 && (
                    <p className="text-xs text-muted mb-3">
                      {t('written_by')} {authors.slice(0, 3).join(', ')}
                    </p>
                  )}
                  <p className="text-muted font-serif italic leading-relaxed line-clamp-3">
                    {description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
