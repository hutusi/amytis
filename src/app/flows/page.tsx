import { getAllFlows, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';
import Pagination from '@/components/Pagination';

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
      <PageHeader
        titleKey="flow"
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: allFlows.length }}
      />

      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} tags={tags} />

        <div className="flex-1 min-w-0">
          {flows.length === 0 ? (
            <p className="text-muted">{t('no_flows')}</p>
          ) : (
            <div className="space-y-0">
              {flows.map(flow => (
                <FlowTimelineEntry
                  key={flow.slug}
                  date={flow.date}
                  title={flow.title}
                  excerpt={flow.excerpt}
                  tags={flow.tags}
                  slug={flow.slug}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination currentPage={1} totalPages={totalPages} basePath="/flows" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
