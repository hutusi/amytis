import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../../site.config';
import { resolveImageUrl } from '@/lib/json-ld';
import { getBookChapterUrl, getBookUrl, getNoteUrl, getPostUrl, getPostsBasePath, getSeriesUrl, isNonDefaultLocale, localizeUrl, withTrailingSlash } from '@/lib/urls';
import { buildArticleMetadata, siteOpenGraph, siteTwitterHandles, withSiteAlternates } from '@/lib/metadata';
import { getTranslator, resolveLocaleValue } from '@/lib/i18n';
import RenderPostPage from '@/components/RenderPostPage';
import PostsListingBody from '@/components/page-bodies/PostsListingBody';
import SeriesPrefixListingBody from '@/components/page-bodies/SeriesPrefixListingBody';
import SeriesLandingBody from '@/components/page-bodies/SeriesLandingBody';
import NotesIndexBody from '@/components/page-bodies/NotesIndexBody';
import NoteDetailBody from '@/components/page-bodies/NoteDetailBody';
import BookLandingBody from '@/components/page-bodies/BookLandingBody';
import BookChapterBody from '@/components/page-bodies/BookChapterBody';
import {
  bookContentLocales,
  chapterContentLocales,
  contentSeoUrls,
  localeDeepParams,
  resolveLocalizedPath,
  type LocalizedResolution,
} from '@/lib/locale-routes';
import { getPostContentLocales } from '@/lib/content/posts';
import { getNoteContentLocales } from '@/lib/content/notes';
import { safeDecodeParam } from '@/lib/route-params';
import { getSeriesData, getSeriesPosts } from '@/lib/content/series';

/**
 * Deep locale-prefixed paths (three or more segments): /zh/posts/<slug>,
 * /zh/series/<s>[/page/<n>], /zh/books/<b>/<...chapter>, /zh/notes/<slug>,
 * and listing pagination. The unprefixed tree serves these shapes through its
 * literal section routes; under a locale prefix they all funnel through this
 * catch-all because a sibling [locale] segment cannot coexist with [slug].
 * A dynamic [postSlug] sibling and this [...rest] catch-all CAN coexist —
 * Next tracks dynamic and catch-all slots separately at each tree level.
 */

export async function generateStaticParams() {
  const params = localeDeepParams();
  // Placeholder keeps Next.js happy with output: export when no locale trees exist.
  // dynamicParams = false ensures any unrecognised path returns 404.
  return params.length > 0 ? params : [{ slug: '_', postSlug: '_', rest: ['_'] }];
}

export const dynamicParams = false;

type DeepParams = Promise<{ slug: string; postSlug: string; rest: string[] }>;

function resolveFromParams(slug: string, postSlug: string, rest: string[]): { locale: string; resolution: LocalizedResolution } | null {
  const locale = safeDecodeParam(slug);
  if (!isNonDefaultLocale(locale)) return null;
  return { locale, resolution: resolveLocalizedPath(locale, [postSlug, ...rest]) };
}

export async function generateMetadata({ params }: { params: DeepParams }): Promise<Metadata> {
  const { slug, postSlug, rest } = await params;
  const resolved = resolveFromParams(slug, postSlug, rest);
  if (!resolved) return { title: 'Page Not Found' };
  const { locale, resolution } = resolved;
  const { t, tWith } = getTranslator(locale);
  const siteTitle = resolveLocaleValue(siteConfig.title, locale);
  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');

  switch (resolution?.kind) {
    case 'post': {
      // A zh TWIN canonicalizes to its unprefixed URL (same canonical as the
      // default-tree side); a zh-original is self-canonical with no languages.
      const seo = contentSeoUrls(getPostUrl(resolution.post), getPostContentLocales(resolution.post));
      return buildArticleMetadata({
        locale,
        title: resolution.post.title,
        description: resolution.post.excerpt,
        publishedTime: resolution.post.date,
        authors: resolution.post.authors,
        canonicalUrl: seo.canonicalUrl,
        languageAlternates: seo.languageAlternates,
        ogImage: resolveImageUrl(resolution.post.coverImage, siteConfig.ogImage, siteUrl),
        twitterCard: 'summary_large_image',
      });
    }
    case 'seriesPage':
    case 'seriesPrefixListing': {
      const seriesData = getSeriesData(resolution.seriesSlug, locale);
      if (!seriesData) return { title: 'Page Not Found' };
      const totalPages = Math.ceil(
        getSeriesPosts(resolution.seriesSlug, locale).length / siteConfig.pagination.series
      );
      const pageSuffix = resolution.page > 1
        ? ` - ${tWith('page_of_total', { page: resolution.page, total: totalPages })}`
        : '';
      // Entity OG mirrors the unprefixed series landing: cover image, og:url,
      // per-cover twitter card. The URL reflects the ACTUAL route variant
      // (/series/<s> vs /<prefix>) and page number — a paginated page must
      // not identify itself as page 1.
      const ogImage = resolveImageUrl(seriesData.coverImage, siteConfig.ogImage, siteUrl);
      const defaultOgImage = resolveImageUrl(undefined, siteConfig.ogImage, siteUrl);
      const landingPath = resolution.kind === 'seriesPrefixListing'
        ? `/${resolution.prefix}`
        : getSeriesUrl(resolution.seriesSlug);
      const pagePath = resolution.page > 1 ? `${landingPath}/page/${resolution.page}` : landingPath;
      const pageUrl = withTrailingSlash(`${siteUrl}${localizeUrl(pagePath, locale)}`);
      return buildArticleMetadata({
        locale,
        title: seriesData.title,
        titleSuffix: `${pageSuffix} - ${t('series')}`,
        description: seriesData.excerpt,
        type: 'website',
        url: pageUrl,
        canonicalUrl: pageUrl,
        ogImage,
        twitterCard: ogImage !== defaultOgImage ? 'summary_large_image' : 'summary',
      });
    }
    case 'postsListing':
      return { title: `${t('posts')} | ${siteTitle}`, description: t('posts_description'), openGraph: siteOpenGraph(locale) };
    case 'notesListing':
      return { title: `${t('notes')} | ${siteTitle}`, openGraph: siteOpenGraph(locale) };
    case 'book': {
      const seo = contentSeoUrls(
        localizeUrl(getBookUrl(resolution.book.slug), locale),
        bookContentLocales(resolution.book.slug)
      );
      const ogImage = resolveImageUrl(resolution.book.coverImage, siteConfig.ogImage, siteUrl);
      const defaultOgImage = resolveImageUrl(undefined, siteConfig.ogImage, siteUrl);
      return buildArticleMetadata({
        locale,
        title: resolution.book.title,
        description: resolution.book.excerpt,
        type: 'website',
        url: seo.canonicalUrl,
        canonicalUrl: seo.canonicalUrl,
        languageAlternates: seo.languageAlternates,
        ogImage,
        twitterCard: ogImage !== defaultOgImage ? 'summary_large_image' : 'summary',
      });
    }
    case 'chapter': {
      const seo = contentSeoUrls(
        localizeUrl(getBookChapterUrl(resolution.book.slug, resolution.chapter.slug), locale),
        chapterContentLocales(resolution.book.slug, resolution.chapter.slug)
      );
      const chapterOgTitle = `${resolution.chapter.title} - ${resolution.book.title}`;
      const ogImage =
        resolution.book.coverImage &&
        !resolution.book.coverImage.startsWith('text:') &&
        !resolution.book.coverImage.startsWith('./')
          ? resolution.book.coverImage
          : siteConfig.ogImage;
      return {
        title: `${chapterOgTitle} | ${siteTitle}`,
        description: resolution.chapter.excerpt,
        alternates: withSiteAlternates({ canonical: seo.canonicalUrl, languages: seo.languageAlternates }),
        openGraph: {
          title: chapterOgTitle,
          description: resolution.chapter.excerpt,
          type: 'article',
          url: seo.canonicalUrl,
          siteName: siteTitle,
          locale,
          images: [{ url: ogImage, width: 1200, height: 630, alt: resolution.chapter.title }],
        },
        twitter: {
          card: ogImage !== siteConfig.ogImage ? 'summary_large_image' : 'summary',
          title: chapterOgTitle,
          description: resolution.chapter.excerpt,
          images: [ogImage],
          ...siteTwitterHandles(),
        },
      };
    }
    case 'note': {
      const seo = contentSeoUrls(
        localizeUrl(getNoteUrl(resolution.note.slug), locale),
        getNoteContentLocales(resolution.note)
      );
      return buildArticleMetadata({
        locale,
        title: resolution.note.title,
        description: resolution.note.excerpt,
        publishedTime: resolution.note.date,
        canonicalUrl: seo.canonicalUrl,
        languageAlternates: seo.languageAlternates,
        twitterCard: 'none',
      });
    }
    default:
      return { title: 'Page Not Found' };
  }
}

export default async function LocaleDeepPage({ params }: { params: DeepParams }) {
  const { slug, postSlug, rest } = await params;
  const resolved = resolveFromParams(slug, postSlug, rest);
  if (!resolved) notFound();
  const { locale, resolution } = resolved;

  switch (resolution?.kind) {
    case 'post':
      return <RenderPostPage post={resolution.post} locale={locale} />;
    case 'seriesPage':
      return <SeriesLandingBody locale={locale} seriesSlug={resolution.seriesSlug} page={resolution.page} />;
    case 'seriesPrefixListing':
      return (
        <SeriesPrefixListingBody
          locale={locale}
          seriesSlug={resolution.seriesSlug}
          prefix={resolution.prefix}
          page={resolution.page}
        />
      );
    case 'postsListing':
      return (
        <PostsListingBody
          locale={locale}
          page={resolution.page}
          paginationBasePath={localizeUrl(`/${getPostsBasePath()}`, locale)}
        />
      );
    case 'notesListing':
      return <NotesIndexBody locale={locale} page={resolution.page} />;
    case 'book':
      return <BookLandingBody locale={locale} bookSlug={resolution.book.slug} />;
    case 'chapter':
      return <BookChapterBody locale={locale} bookSlug={resolution.book.slug} chapterId={resolution.chapter.slug} />;
    case 'note':
      return <NoteDetailBody locale={locale} noteSlug={resolution.note.slug} />;
    default:
      notFound();
  }
}
