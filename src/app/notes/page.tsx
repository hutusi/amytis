import { getAllNotes, getNoteTags } from '@/lib/content/notes';
import { isFeatureEnabled } from '@/lib/features';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { firstPage } from '@/lib/pagination';
import { createListingMetadata } from '@/lib/metadata';
import NoteContent from '@/components/NoteContent';
import PageHeader from '@/components/PageHeader';

const PAGE_SIZE = siteConfig.pagination.notes ?? 20;

export const metadata: Metadata = createListingMetadata({
  titleKey: 'notes',
  description: 'Knowledge base notes.',
});

export default function NotesPage() {
  if (!isFeatureEnabled('flow')) notFound();
  const allNotes = getAllNotes();
  const { items: notes, totalPages } = firstPage(allNotes, PAGE_SIZE);
  const tags = getNoteTags();

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="notes"
        subtitleKey="notes_subtitle"
        subtitleParams={{ count: allNotes.length }}
        className="mb-12"
      />
      <NoteContent
        notes={notes}
        tags={tags}
        pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/notes' } : undefined}
      />
    </div>
  );
}
