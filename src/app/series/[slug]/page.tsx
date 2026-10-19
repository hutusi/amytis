import { getSeriesData, getSeriesPosts } from '@/lib/content/series';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { getTranslator, resolveLocaleValue } from '@/lib/i18n';
import { getSeriesUrl, localizeUrl, withTrailingSlash } from '@/lib/urls';
import SeriesLandingBody from '@/components/page-bodies/SeriesLandingBody';
import RedirectPage from '@/components/RedirectPage';
import { seriesSlugParams, resolveSeriesParam } from '@/lib/route-aliases';
import { isFeatureEnabled } from '@/lib/features';
import { resolveImageUrl } from '@/lib/json-ld';
import { buildRedirectMetadata, buildArticleMetadata } from '@/lib/metadata';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;
const { t } = getTranslator(DEFAULT_LOCALE);

export async function generateStaticParams() {
  if (!isFeatureEnabled('series')) return [{ slug: '_' }];
  return seriesSlugParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    return buildRedirectMetadata({
      title: resolution.data.title,
      to: localizeUrl(getSeriesUrl(resolution.canonicalSlug), resolution.data.locale),
    });
  }
  const slug = resolution.slug;

  const seriesData = getSeriesData(slug);

  if (!seriesData) {
    // If no explicit series metadata, try to infer from posts or return default
    const posts = getSeriesPosts(slug);
    if (posts.length > 0) {
        return {
            title: `${slug} - ${t('series')} | ${resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE)}`,
            description: `${posts.length} ${t('posts').toLowerCase()} - ${slug}.`,
        }
    }
    return { title: 'Series Not Found' };
  }

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const ogImage = resolveImageUrl(seriesData.coverImage, siteConfig.ogImage, siteUrl);
  const defaultOgImage = resolveImageUrl(undefined, siteConfig.ogImage, siteUrl);

  const canonicalUrl = withTrailingSlash(`${siteUrl}${getSeriesUrl(slug)}`);
  return buildArticleMetadata({
    locale: DEFAULT_LOCALE,
    title: seriesData.title,
    titleSuffix: ` - ${t('series')}`,
    description: seriesData.excerpt,
    type: 'website',
    url: canonicalUrl,
    canonicalUrl,
    ogImage,
    twitterCard: ogImage !== defaultOgImage ? 'summary_large_image' : 'summary',
  });
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isFeatureEnabled('series')) notFound();
  const { slug: rawSlug } = await params;
  const resolution = resolveSeriesParam(rawSlug);
  if (resolution.kind === 'alias') {
    return <RedirectPage to={localizeUrl(getSeriesUrl(resolution.canonicalSlug), resolution.data.locale)} />;
  }
  return <SeriesLandingBody locale={DEFAULT_LOCALE} seriesSlug={resolution.slug} page={1} />;
}
