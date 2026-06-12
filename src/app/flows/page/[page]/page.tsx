import { getAllFlows, getFlowTags } from '@/lib/content/flows';
import { isFeatureEnabled } from '@/lib/features';
import { paginate, paginationStaticParams } from '@/lib/pagination';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import FlowContent from '@/components/FlowContent';
import FlowViewSwitcher from '@/components/FlowViewSwitcher';
import PageHeader from '@/components/PageHeader';

const PAGE_SIZE = siteConfig.pagination.flows;

export function generateStaticParams() {
  return paginationStaticParams(getAllFlows().length, PAGE_SIZE, {
    enabled: isFeatureEnabled('flow'),
  });
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `${t('flow')} - ${page} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function FlowsPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  if (!isFeatureEnabled('flow')) notFound();
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);
  const allFlows = getAllFlows();
  const slice = paginate(allFlows, page, PAGE_SIZE);
  if (!slice || page < 2) notFound();
  const { items: flows, totalPages } = slice;

  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();
  const allFlowItems = allFlows.map(({ slug, date, title, excerpt, tags }) => ({ slug, date, title, excerpt, tags }));

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flow"
        subtitleKey="page_of_total"
        subtitleParams={{ page, total: totalPages }}
        className="mb-8"
      />
      <FlowViewSwitcher />
      <FlowContent
        flows={flows}
        allFlows={allFlowItems}
        entryDates={entryDates}
        tags={tags}
        pagination={{ currentPage: page, totalPages, basePath: '/flows' }}
      />
    </div>
  );
}
