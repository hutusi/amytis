import { getAllFlows, getFlowTags } from '@/lib/content/flows';
import { buildSlugRegistry } from '@/lib/content/discovery';
import { isFeatureEnabled } from '@/lib/features';
import { paginate, paginationStaticParams } from '@/lib/pagination';
import { toFlowIndexItems } from '@/lib/flow-stream';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createListingMetadata } from '@/lib/metadata';
import FlowIndexClient from '@/components/FlowIndexClient';
import FlowStream from '@/components/FlowStream';
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
  const totalPages = Math.ceil(getAllFlows().length / PAGE_SIZE);
  return createListingMetadata({ titleKey: 'flow', page: parseInt(page, 10), totalPages });
}

export default async function FlowsPaginatedPage({ params }: { params: Promise<{ page: string }> }) {
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
      <PageHeader
        titleKey="flow"
        subtitleKey="page_of_total"
        subtitleParams={{ page, total: totalPages }}
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
            pagination={{ currentPage: page, totalPages, basePath: '/flows' }}
          />
        }
      />
    </div>
  );
}
