import { getAllFlows } from '@/lib/content/flows';
import { buildSlugRegistry } from '@/lib/content/discovery';
import { isFeatureEnabled } from '@/lib/features';
import { firstPage } from '@/lib/pagination';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import FlowStream from '@/components/FlowStream';
import FlowViewSwitcher from '@/components/FlowViewSwitcher';
import PageHeader from '@/components/PageHeader';

const PAGE_SIZE = siteConfig.pagination.flows;

export const metadata: Metadata = {
  title: `${t('flow')} · ${t('flow_view_stream')} | ${resolveLocale(siteConfig.title)}`,
  description: t('flow_stream_description'),
};

export default function FlowStreamPage() {
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
        className="mb-8"
      />
      <FlowViewSwitcher />
      <FlowStream
        flows={flows}
        slugRegistry={slugRegistry}
        pagination={totalPages > 1 ? { currentPage: 1, totalPages, basePath: '/flows/stream' } : undefined}
      />
    </div>
  );
}
