import { getAllSeries, getSeriesData, getSeriesLatestPostDate, resolveSeriesAuthors } from '@/lib/content/series';
import { getSeriesUrl } from '@/lib/urls';
import { Metadata } from 'next';
import ContentCard from '@/components/ContentCard';
import { t } from '@/lib/i18n';
import { createListingMetadata } from '@/lib/metadata';
import PageHeader from '@/components/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  const count = Object.keys(getAllSeries()).length;
  return createListingMetadata({ titleKey: 'series', descriptionKey: 'series_subtitle', count });
}

export default function SeriesIndexPage() {
  const allSeries = getAllSeries();

  // Sort by most recent post date (active series first)
  const seriesSlugs = Object.keys(allSeries).sort((a, b) => {
    const latestA = getSeriesLatestPostDate(a);
    const latestB = getSeriesLatestPostDate(b);
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
          const description = seriesData?.excerpt || t('series_default_excerpt');
          const authors = resolveSeriesAuthors(slug, posts);

          return (
            <ContentCard
              key={slug}
              href={getSeriesUrl(slug)}
              title={title}
              slug={slug}
              coverImage={seriesData?.coverImage}
              badge={`${posts.length} ${t('parts')}`}
              authors={authors}
              excerpt={description}
            />
          );
        })}
      </div>
    </div>
  );
}
