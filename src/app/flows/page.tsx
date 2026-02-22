import { getAllFlows, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import FlowContent from '@/components/FlowContent';
import FlowHubTabs from '@/components/FlowHubTabs';

const PAGE_SIZE = siteConfig.pagination.flows;

export const metadata: Metadata = {
  title: `${t('flow')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Daily notes and quick thoughts.',
};

export default function FlowsPage() {
  const allFlows = getAllFlows();
  const totalPages = Math.ceil(allFlows.length / PAGE_SIZE);
  const flows = allFlows.slice(0, PAGE_SIZE);
  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();

  return (
    <div className="layout-main">
      <FlowHubTabs subtitle={tWith('flow_subtitle', { count: allFlows.length })} />
      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/flows' } : undefined}
      />
    </div>
  );
}
