import { getAllNotes, getNoteTags } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import NoteContent from '@/components/NoteContent';
import FlowHubTabs from '@/components/FlowHubTabs';

const PAGE_SIZE = siteConfig.pagination.notes ?? 20;

export const metadata: Metadata = {
  title: `${t('notes')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Knowledge base notes.',
};

export default function NotesPage() {
  const allNotes = getAllNotes();
  const totalPages = Math.ceil(allNotes.length / PAGE_SIZE);
  const notes = allNotes.slice(0, PAGE_SIZE);
  const tags = getNoteTags();

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="notes"
        subtitleKey="notes_subtitle"
        subtitleParams={{ count: allNotes.length }}
      />
      <FlowHubTabs />
      <NoteContent
        notes={notes}
        tags={tags}
        pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/notes' } : undefined}
      />
    </div>
  );
}
