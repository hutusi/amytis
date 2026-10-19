import { getSeriesData } from '@/lib/content/series';
import { notFound } from 'next/navigation';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import PostsListingBody from '@/components/page-bodies/PostsListingBody';
import SeriesPrefixListingBody from '@/components/page-bodies/SeriesPrefixListingBody';
import { Metadata } from 'next';
import { siteConfig } from '../../../site.config';
import { buildRedirectMetadata, siteOpenGraph, withSiteAlternates } from '@/lib/metadata';
import { getTranslator, resolveLocaleValue } from '@/lib/i18n';
import { topLevelSlugParams, resolveTopLevelSlug } from '@/lib/route-aliases';
import { contentSeoUrls, localeHomeParams, resolveLocalizedPath } from '@/lib/locale-routes';
import { getPageContentLocales } from '@/lib/content/posts';
import { getStaticPageUrl, isNonDefaultLocale, localizeUrl } from '@/lib/urls';
import { safeDecodeParam } from '@/lib/route-params';
import RedirectPage from '@/components/RedirectPage';
import LocaleHomeBody from '@/components/page-bodies/LocaleHomeBody';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;
const { t } = getTranslator(DEFAULT_LOCALE);

/**
 * Generates the static paths for all top-level pages at build time,
 * plus any custom URL prefixes configured for posts or series, plus the
 * locale roots (/zh) of locale trees with content.
 * Alias collisions throw inside topLevelSlugParams (strict build).
 */
export async function generateStaticParams() {
  return [...topLevelSlugParams(), ...localeHomeParams()];
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;

  // Locale root (/zh) — locale codes are reserved segments, so this cannot
  // shadow a real page or alias.
  const localeSlug = safeDecodeParam(rawSlug);
  if (isNonDefaultLocale(localeSlug)) {
    if (!resolveLocalizedPath(localeSlug, [])) return { title: 'Page Not Found' };
    return {
      title: resolveLocaleValue(siteConfig.title, localeSlug),
      description: resolveLocaleValue(siteConfig.description, localeSlug),
      openGraph: siteOpenGraph(localeSlug),
    };
  }

  const resolution = resolveTopLevelSlug(rawSlug);

  switch (resolution?.kind) {
    case 'postsListing':
      return {
        title: `${t('posts')} | ${resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE)}`,
        description: t('posts_description'),
      };
    case 'seriesListing': {
      const seriesData = getSeriesData(resolution.seriesSlug);
      if (seriesData) {
        return {
          title: `${seriesData.title} - ${t('series')} | ${resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE)}`,
          description: seriesData.excerpt,
        };
      }
      return { title: 'Page Not Found' };
    }
    case 'page': {
      // Twin pages canonicalize here (the unprefixed URL) and advertise the
      // reciprocal hreflang set; single-locale pages get a plain canonical.
      const seo = contentSeoUrls(
        localizeUrl(getStaticPageUrl(resolution.page.slug), resolution.page.locale),
        getPageContentLocales(resolution.page)
      );
      return {
        title: `${resolution.page.title} | ${resolveLocaleValue(siteConfig.title, DEFAULT_LOCALE)}`,
        description: resolution.page.excerpt,
        alternates: withSiteAlternates({ canonical: seo.canonicalUrl, languages: seo.languageAlternates }),
      };
    }
    case 'redirect':
      return buildRedirectMetadata({ title: resolution.post.title, to: resolution.to });
    default:
      return { title: 'Page Not Found' };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;

  const localeSlug = safeDecodeParam(rawSlug);
  if (isNonDefaultLocale(localeSlug)) {
    if (!resolveLocalizedPath(localeSlug, [])) notFound();
    return <LocaleHomeBody locale={localeSlug} />;
  }

  const resolution = resolveTopLevelSlug(rawSlug);
  if (!resolution) notFound();

  // Custom posts basePath listing (e.g. /articles)
  if (resolution.kind === 'postsListing') {
    return <PostsListingBody locale={DEFAULT_LOCALE} page={1} paginationBasePath={`/${resolution.basePath}`} />;
  }

  // Series listing at a custom or auto path (e.g. /weeklies, /my-series)
  if (resolution.kind === 'seriesListing') {
    return (
      <SeriesPrefixListingBody
        locale={DEFAULT_LOCALE}
        seriesSlug={resolution.seriesSlug}
        prefix={resolution.prefix}
        page={1}
      />
    );
  }

  // Single-segment redirectFrom — resolveTopLevelSlug only reports this when
  // no real page exists for the slug, so aliases can't hijack real pages.
  if (resolution.kind === 'redirect') {
    return <RedirectPage to={resolution.to} />;
  }

  // Default: static page
  const page = resolution.page;
  const layout = page.layout || 'simple';

  if (layout === 'post') {
    return <PostLayout post={page} locale={DEFAULT_LOCALE} commentCategory="staticPages" />;
  }

  return <SimpleLayout post={page} />;
}
