import { getAllNotes, getNoteTags } from '@/lib/content/notes';
import { isFeatureEnabled } from '@/lib/features';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { firstPage } from '@/lib/pagination';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import NoteContent from '@/components/NoteContent';
import FlowHubTabs from '@/components/FlowHubTabs';

const PAGE_SIZE = siteConfig.pagination.notes ?? 20;

export const metadata: Metadata = {
  title: `${t('notes')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Knowledge base notes.',
};

export default function NotesPage() {
  if (!isFeatureEnabled('flow')) notFound();
  const allNotes = getAllNotes();
  const { items: notes, totalPages } = firstPage(allNotes, PAGE_SIZE);
  const tags = getNoteTags();

  return (
    <div className="layout-main">
      <FlowHubTabs subtitle={tWith('notes_subtitle', { count: allNotes.length })} />
      <NoteContent
        notes={notes}
        tags={tags}
        pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/notes' } : undefined}
      />
    </div>
  );
}
