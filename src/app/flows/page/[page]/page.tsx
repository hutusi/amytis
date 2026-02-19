import { getAllFlows, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowContent from '@/components/FlowContent';

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
  const page = parseInt(pageStr);
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
      <PageHeader
        titleKey="flow"
        subtitleKey="page_of_total"
        subtitleParams={{ page, total: totalPages }}
        className="mb-12"
      />

      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        pagination={{ currentPage: page, totalPages, basePath: '/flows' }}
      />
    </div>
  );
}
