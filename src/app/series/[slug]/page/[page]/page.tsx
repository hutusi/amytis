import { getSeriesData, getSeriesPosts, getCollectionPosts } from '@/lib/content/series';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../../site.config';
import { getTranslator, resolveLocaleValue } from '@/lib/i18n';
import { getSeriesListUrl, localizeUrl } from '@/lib/urls';
import SeriesLandingBody from '@/components/page-bodies/SeriesLandingBody';
import RedirectPage from '@/components/RedirectPage';
import { seriesPageParams, resolveSeriesParam } from '@/lib/route-aliases';
import { buildRedirectMetadata } from '@/lib/metadata';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;
const { tWith } = getTranslator(DEFAULT_LOCALE);

const PAGE_SIZE = siteConfig.pagination.series;

export async function generateStaticParams() {
  return seriesPageParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const { slug: rawSlug, page } = await params;
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    // Same target the page body redirects to (localized like the alias).
    return buildRedirectMetadata({
      title: resolution.data.title,
      to: localizeUrl(`${getSeriesListUrl()}/${resolution.canonicalSlug}/page/${page}`, resolution.data.locale),
    });
  }
  const slug = resolution.slug;

  const seriesData = getSeriesData(slug);
  const title = seriesData?.title || slug;
  const allPosts = seriesData?.type === 'collection' ? getCollectionPosts(slug) : getSeriesPosts(slug);
  const totalPages = Math.ceil(allPosts.length / PAGE_SIZE);
  return {
    title: `${title} - ${tWith('page_of_total', { page, total: totalPages })} | ${resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE)}`,
  };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug: rawSlug, page: pageStr } = await params;
  const page = parseInt(pageStr);
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    return <RedirectPage to={localizeUrl(`${getSeriesListUrl()}/${resolution.canonicalSlug}/page/${page}`, resolution.data.locale)} />;
  }
  if (isNaN(page) || page < 2) notFound();
  return <SeriesLandingBody locale={DEFAULT_LOCALE} seriesSlug={resolution.slug} page={page} />;
}
