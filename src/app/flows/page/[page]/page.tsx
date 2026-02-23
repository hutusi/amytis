import { getAllFlows, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import FlowContent from '@/components/FlowContent';
import FlowHubTabs from '@/components/FlowHubTabs';

const PAGE_SIZE = siteConfig.pagination.flows;

export function generateStaticParams() {
  const allFlows = getAllFlows();
  const totalPages = Math.ceil(allFlows.length / PAGE_SIZE);

  // Always generate at least page 2 for static export compatibility
  const pageCount = Math.max(1, totalPages - 1);
  return Array.from({ length: pageCount }, (_, i) => ({
    page: (i + 2).toString(),
  }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `${t('flow')} - ${page} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function FlowsPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);
  const allFlows = getAllFlows();
  const totalPages = Math.ceil(allFlows.length / PAGE_SIZE);

  if (page > totalPages) notFound();

  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const flows = allFlows.slice(start, end);

  return (
    <div className="layout-main">
      <FlowHubTabs subtitle={tWith('page_of_total', { page, total: totalPages })} />
      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        pagination={{ currentPage: page, totalPages, basePath: '/flows' }}
      />
    </div>
  );
}
