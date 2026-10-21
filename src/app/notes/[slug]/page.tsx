import { safeDecodeParam } from '@/lib/route-params';
import { getNoteUrl, localizeUrl } from '@/lib/urls';
import { isFeatureEnabled } from '@/lib/features';
import { getAllNotes, getNoteBySlug, getNoteContentLocales } from '@/lib/content/notes';
import { contentSeoUrls } from '@/lib/locale-routes';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import { buildArticleMetadata } from '@/lib/metadata';
import { getShareImage } from '@/lib/og-images';
import NoteDetailBody from '@/components/page-bodies/NoteDetailBody';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

export function generateStaticParams() {
  if (!isFeatureEnabled('flow')) return [{ slug: '_' }];
  const notes = getAllNotes();
  if (notes.length === 0) return [{ slug: '_' }];
  // Work around Next dev static-param checks for percent-encoded Unicode paths
  // under `output: "export"` by including encoded variants only in development.
  const slugs = new Set<string>();
  for (const note of notes) {
    slugs.add(note.slug);
    if (process.env.NODE_ENV !== 'production') {
      slugs.add(encodeURIComponent(note.slug));
    }
  }
  return Array.from(slugs).map(slug => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const note = getNoteBySlug(safeDecodeParam(rawSlug)) ?? getNoteBySlug(rawSlug);
  if (!note) return { title: 'Not Found' };
  // Twin notes canonicalize to the unprefixed URL with reciprocal hreflang;
  // single-locale notes keep their plain self-canonical (byte-identical).
  const notePath = localizeUrl(getNoteUrl(note.slug), note.locale);
  const seo = contentSeoUrls(notePath, getNoteContentLocales(note));
  // Notes have no cover: a generated card, or no image at all.
  const card = getShareImage({ kind: 'note', pagePath: notePath });
  return buildArticleMetadata({
    locale: DEFAULT_LOCALE,
    title: note.title,
    description: note.excerpt,
    publishedTime: note.date,
    canonicalUrl: seo.canonicalUrl,
    languageAlternates: seo.languageAlternates,
    ogImage: card.source === 'card' ? card.url : undefined,
    twitterCard: card.source === 'card' ? 'summary_large_image' : 'none',
  });
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!isFeatureEnabled('flow')) notFound();
  const { slug: rawSlug } = await params;
  const slug = safeDecodeParam(rawSlug);
  const note = getNoteBySlug(slug) ?? getNoteBySlug(rawSlug);
  if (!note) notFound();
  return <NoteDetailBody locale={DEFAULT_LOCALE} noteSlug={note.slug} />;
}
