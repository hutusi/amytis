import { getAllFlows } from '@/lib/content/flows';
import { buildSlugRegistry } from '@/lib/content/discovery';
import { isFeatureEnabled } from '@/lib/features';
import { paginate, paginationStaticParams } from '@/lib/pagination';
import { siteConfig } from '../../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import FlowHubTabs from '@/components/FlowHubTabs';
import FlowStream from '@/components/FlowStream';

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
    title: `${t('flow')} · ${t('flow_view_stream')} - ${page} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function FlowStreamPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
  if (!isFeatureEnabled('flow')) notFound();
  const { page: pageStr } = await params;
  const page = parseInt(pageStr, 10);
  const allFlows = getAllFlows();
  const slice = paginate(allFlows, page, PAGE_SIZE);
  if (!slice || page < 2) notFound();
  const { items: flows, totalPages } = slice;
  const slugRegistry = buildSlugRegistry();

  return (
    <div className="layout-main">
      <FlowHubTabs subtitle={tWith('page_of_total', { page, total: totalPages })} />
      <FlowStream
        flows={flows}
        slugRegistry={slugRegistry}
        pagination={{ currentPage: page, totalPages, basePath: '/flows/stream' }}
      />
    </div>
  );
}
