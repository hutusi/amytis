import { getAllNotes, getNoteTags } from '@/lib/markdown';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import NoteContent from '@/components/NoteContent';
import FlowHubTabs from '@/components/FlowHubTabs';

const PAGE_SIZE = siteConfig.pagination.notes ?? 20;

export function generateStaticParams() {
  const allNotes = getAllNotes();
  const totalPages = Math.ceil(allNotes.length / PAGE_SIZE);
  const pageCount = Math.max(1, totalPages - 1);
  return Array.from({ length: pageCount }, (_, i) => ({
    page: (i + 2).toString(),
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `${t('notes')} - ${page} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function NotesPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);
  const allNotes = getAllNotes();
  const totalPages = Math.ceil(allNotes.length / PAGE_SIZE);

  if (page > totalPages) notFound();

  const tags = getNoteTags();
  const start = (page - 1) * PAGE_SIZE;
  const notes = allNotes.slice(start, start + PAGE_SIZE);

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="notes"
        subtitleKey="page_of_total"
        subtitleParams={{ page, total: totalPages }}
        className="mb-12"
      />
      <FlowHubTabs />
      <NoteContent
        notes={notes}
        tags={tags}
        pagination={{ currentPage: page, totalPages, basePath: '/notes' }}
      />
    </div>
  );
}
