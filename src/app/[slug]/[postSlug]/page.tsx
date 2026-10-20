import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { resolveImageUrl } from '@/lib/json-ld';
import { getPostUrl, getPostsBasePath, getStaticPageUrl, isNonDefaultLocale, localizeUrl, withTrailingSlash } from '@/lib/urls';
import { buildRedirectMetadata, buildArticleMetadata, createListingMetadata, siteOpenGraph, withSiteAlternates } from '@/lib/metadata';
import { getTranslator, resolveLocaleValue } from '@/lib/i18n';
import { getPageContentLocales, getPostContentLocales } from '@/lib/content/posts';
import RedirectPage from '@/components/RedirectPage';
import RenderPostPage from '@/components/RenderPostPage';
import PostLayout from '@/layouts/PostLayout';
import SimpleLayout from '@/layouts/SimpleLayout';
import PostsListingBody from '@/components/page-bodies/PostsListingBody';
import SeriesPrefixListingBody from '@/components/page-bodies/SeriesPrefixListingBody';
import SeriesIndexBody from '@/components/page-bodies/SeriesIndexBody';
import BooksIndexBody from '@/components/page-bodies/BooksIndexBody';
import NotesIndexBody from '@/components/page-bodies/NotesIndexBody';
import { prefixedPostParams, resolvePrefixedPost } from '@/lib/route-aliases';
import { contentSeoUrls, localeSecondLevelParams, resolveLocalizedPath, type LocalizedResolution } from '@/lib/locale-routes';
import { safeDecodeParam } from '@/lib/route-params';
import { getAllSeries, getSeriesData } from '@/lib/content/series';
import { getAllBooks } from '@/lib/content/books';
import { getAllNotes } from '@/lib/content/notes';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

export async function generateStaticParams() {
  return [...prefixedPostParams(), ...localeSecondLevelParams()];
}

export const dynamicParams = false;

/** Metadata for the /<locale>/<x> surface — mirrors each unprefixed page kind. */
function localizedMetadata(locale: string, resolution: LocalizedResolution): Metadata {
  const { t } = getTranslator(locale);
  switch (resolution?.kind) {
    case 'page': {
      // Twin pages canonicalize to the unprefixed URL; zh-only pages self-canonicalize.
      const seo = contentSeoUrls(
        localizeUrl(getStaticPageUrl(resolution.page.slug), resolution.page.locale),
        getPageContentLocales(resolution.page)
      );
      return {
        title: `${resolution.page.title} | ${resolveLocaleValue(siteConfig.title, locale)}`,
        description: resolution.page.excerpt,
        openGraph: siteOpenGraph(locale),
        alternates: withSiteAlternates({ canonical: seo.canonicalUrl, languages: seo.languageAlternates }),
      };
    }
    case 'postsListing':
      return {
        title: `${t('posts')} | ${resolveLocaleValue(siteConfig.title, locale)}`,
        description: t('posts_description'),
        openGraph: siteOpenGraph(locale),
      };
    case 'seriesIndexListing':
      return createListingMetadata({
        locale, titleKey: 'series', descriptionKey: 'series_subtitle',
        count: Object.keys(getAllSeries(locale)).length,
      });
    case 'booksListing':
      return createListingMetadata({
        locale, titleKey: 'books', descriptionKey: 'books_subtitle',
        descriptionOneKey: 'books_subtitle_one', count: getAllBooks(locale).length,
      });
    case 'notesListing':
      return createListingMetadata({
        locale, titleKey: 'notes', descriptionKey: 'notes_subtitle',
        descriptionOneKey: 'notes_subtitle_one', count: getAllNotes(locale).length,
      });
    case 'seriesPrefixListing': {
      const seriesData = getSeriesData(resolution.seriesSlug, locale);
      if (!seriesData) return { title: 'Page Not Found' };
      // Entity OG like the /zh/series/<slug> landing — same series, same
      // treatment, just the prefix URL form.
      const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
      const ogImage = resolveImageUrl(seriesData.coverImage, siteConfig.ogImage, siteUrl);
      const defaultOgImage = resolveImageUrl(undefined, siteConfig.ogImage, siteUrl);
      const landingUrl = withTrailingSlash(`${siteUrl}${localizeUrl(`/${resolution.prefix}`, locale)}`);
      return buildArticleMetadata({
        locale,
        title: seriesData.title,
        titleSuffix: ` - ${t('series')}`,
        description: seriesData.excerpt,
        type: 'website',
        url: landingUrl,
        canonicalUrl: landingUrl,
        ogImage,
        twitterCard: ogImage !== defaultOgImage ? 'summary_large_image' : 'summary',
      });
    }
    default:
      return { title: 'Page Not Found' };
  }
}

/** Body for the /<locale>/<x> surface. */
function LocalizedSecondLevel({ locale, resolution }: { locale: string; resolution: LocalizedResolution }) {
  switch (resolution?.kind) {
    case 'page': {
      const page = resolution.page;
      if ((page.layout || 'simple') === 'post') {
        return <PostLayout post={page} locale={locale} commentCategory="staticPages" />;
      }
      return <SimpleLayout post={page} />;
    }
    case 'postsListing':
      return (
        <PostsListingBody
          locale={locale}
          page={resolution.page}
          paginationBasePath={localizeUrl(`/${getPostsBasePath()}`, locale)}
        />
      );
    case 'seriesIndexListing':
      return <SeriesIndexBody locale={locale} />;
    case 'booksListing':
      return <BooksIndexBody locale={locale} />;
    case 'notesListing':
      return <NotesIndexBody locale={locale} page={resolution.page} />;
    case 'seriesPrefixListing':
      return (
        <SeriesPrefixListingBody
          locale={locale}
          seriesSlug={resolution.seriesSlug}
          prefix={resolution.prefix}
          page={resolution.page}
        />
      );
    default:
      notFound();
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { slug: prefix, postSlug: rawPostSlug } = await params;

  const localeSlug = safeDecodeParam(prefix);
  if (isNonDefaultLocale(localeSlug)) {
    return localizedMetadata(localeSlug, resolveLocalizedPath(localeSlug, [rawPostSlug]));
  }

  const resolution = resolvePrefixedPost(prefix, rawPostSlug);

  if (!resolution) {
    return { title: 'Post Not Found' };
  }

  const { post } = resolution;
  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');

  // For redirect pages, return minimal metadata pointing to the canonical URL
  if (resolution.kind === 'redirect') {
    return buildRedirectMetadata({ title: post.title, to: resolution.to });
  }

  // Twins canonicalize to the unprefixed URL with reciprocal hreflang;
  // single-locale posts keep their plain self-canonical (byte-identical).
  const seo = contentSeoUrls(getPostUrl(post), getPostContentLocales(post));
  return buildArticleMetadata({
    locale: DEFAULT_LOCALE,
    title: post.title,
    description: post.excerpt,
    publishedTime: post.date,
    authors: post.authors,
    canonicalUrl: seo.canonicalUrl,
    languageAlternates: seo.languageAlternates,
    ogImage: resolveImageUrl(post.coverImage, siteConfig.ogImage, siteUrl),
    twitterCard: 'summary_large_image',
  });
}

export default async function PrefixPostPage({
  params,
}: {
  params: Promise<{ slug: string; postSlug: string }>;
}) {
  const { slug: prefix, postSlug: rawPostSlug } = await params;

  const localeSlug = safeDecodeParam(prefix);
  if (isNonDefaultLocale(localeSlug)) {
    const localized = resolveLocalizedPath(localeSlug, [rawPostSlug]);
    if (!localized) notFound();
    return <LocalizedSecondLevel locale={localeSlug} resolution={localized} />;
  }

  const resolution = resolvePrefixedPost(prefix, rawPostSlug);
  if (!resolution) {
    notFound();
  }

  // If the canonical URL differs from the current path, render a redirect page.
  if (resolution.kind === 'redirect') {
    return <RedirectPage to={resolution.to} />;
  }

  return <RenderPostPage post={resolution.post} locale={DEFAULT_LOCALE} />;
}
