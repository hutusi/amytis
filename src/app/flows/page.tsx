import { getAllFlows, getFlowTags, buildSlugRegistry } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import FlowContent from '@/components/FlowContent';
import FlowHubTabs from '@/components/FlowHubTabs';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const PAGE_SIZE = siteConfig.pagination.flows;

export const metadata: Metadata = {
  title: `${t('flow')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Daily notes and quick thoughts.',
};

export default function FlowsPage() {
  if (siteConfig.features?.flow?.enabled === false) notFound();
  const allFlows = getAllFlows();
  const totalPages = Math.ceil(allFlows.length / PAGE_SIZE);
  const slugRegistry = buildSlugRegistry();

  const flows = allFlows.slice(0, PAGE_SIZE).map(f => ({
    slug: f.slug,
    date: f.date,
    title: f.title,
    tags: f.tags,
    body: <MarkdownRenderer content={f.content} slug={`flows/${f.slug}`} slugRegistry={slugRegistry} />,
  }));

  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();
  const allFlowItems = totalPages > 1
    ? allFlows.map(({ slug, date, title, excerpt, tags }) => ({ slug, date, title, excerpt, tags }))
    : undefined;

  return (
    <div className="layout-main">
      <FlowHubTabs subtitle={tWith('flow_subtitle', { count: allFlows.length })} />
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
