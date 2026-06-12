import { getAllNotes, getNoteTags } from '@/lib/content/notes';
import { isFeatureEnabled } from '@/lib/features';
import { paginate, paginationStaticParams } from '@/lib/pagination';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import NoteContent from '@/components/NoteContent';
import FlowHubTabs from '@/components/FlowHubTabs';

const PAGE_SIZE = siteConfig.pagination.notes ?? 20;

export function generateStaticParams() {
  return paginationStaticParams(getAllNotes().length, PAGE_SIZE, {
    enabled: isFeatureEnabled('flow'),
  });
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `${t('notes')} - ${page} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function NotesPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  if (!isFeatureEnabled('flow')) notFound();
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);
  const slice = paginate(getAllNotes(), page, PAGE_SIZE);
  if (!slice || page < 2) notFound();
  const { items: notes, totalPages } = slice;

  const tags = getNoteTags();

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
