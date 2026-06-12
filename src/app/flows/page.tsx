import { getAllFlows, getFlowTags } from '@/lib/content/flows';
import { buildSlugRegistry } from '@/lib/content/discovery';
import { isFeatureEnabled } from '@/lib/features';
import { firstPage } from '@/lib/pagination';
import { toFlowIndexItems } from '@/lib/flow-stream';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import FlowIndexClient from '@/components/FlowIndexClient';
import FlowStream from '@/components/FlowStream';
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
  const slugRegistry = buildSlugRegistry();

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flow"
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: allFlows.length }}
        className="mb-12"
      />
      <FlowIndexClient
        allFlows={toFlowIndexItems(allFlows)}
        entryDates={allFlows.map(f => f.date)}
        tags={getFlowTags()}
        feed={
          <FlowStream
            flows={flows}
            slugRegistry={slugRegistry}
            pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/flows' } : undefined}
          />
        }
      />
    </div>
  );
}
