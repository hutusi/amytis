import { isFeatureEnabled } from '@/lib/features';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createListingMetadata } from '@/lib/metadata';
import { getAllNotes } from '@/lib/content/notes';
import NotesIndexBody from '@/components/page-bodies/NotesIndexBody';

const DEFAULT_LOCALE = siteConfig.i18n.defaultLocale;

export const metadata: Metadata = createListingMetadata({
  locale: DEFAULT_LOCALE,
  titleKey: 'notes',
  descriptionKey: 'notes_subtitle',
  descriptionOneKey: 'notes_subtitle_one',
  count: getAllNotes().length,
});

export default function NotesPage() {
  if (!isFeatureEnabled('flow')) notFound();
  return <NotesIndexBody locale={DEFAULT_LOCALE} page={1} />;
}
