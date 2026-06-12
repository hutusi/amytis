import { getAllFlows, getFlowTags } from '@/lib/content/flows';
import { isFeatureEnabled } from '@/lib/features';
import { firstPage } from '@/lib/pagination';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import FlowContent from '@/components/FlowContent';
import FlowViewSwitcher from '@/components/FlowViewSwitcher';
import PageHeader from '@/components/PageHeader';

const PAGE_SIZE = siteConfig.pagination.flows;

export const metadata: Metadata = {
  title: `${t('flow')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Daily notes and quick thoughts.',
};

export default function FlowsPage() {
  if (!isFeatureEnabled('flow')) notFound();
  const allFlows = getAllFlows();
  const { items: flows, totalPages } = firstPage(allFlows, PAGE_SIZE);
  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();
  const allFlowItems = totalPages > 1
    ? allFlows.map(({ slug, date, title, excerpt, tags }) => ({ slug, date, title, excerpt, tags }))
    : undefined;

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flow"
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: allFlows.length }}
        className="mb-8"
      />
      <FlowViewSwitcher />
      <FlowContent
        flows={flows}
        allFlows={allFlowItems}
        entryDates={entryDates}
        tags={tags}
        pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/flows' } : undefined}
      />
    </div>
  );
}
