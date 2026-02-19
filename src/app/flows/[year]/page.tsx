import { getAllFlows, getFlowsByYear } from '@/lib/markdown';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';

export function generateStaticParams() {
  const allFlows = getAllFlows();
  const years = new Set(allFlows.map(f => f.slug.split('/')[0]));
  return Array.from(years).map(year => ({ year }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${tWith('flows_in_year', { year })} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function FlowsYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const flows = getFlowsByYear(year);
  if (flows.length === 0) notFound();

  const allFlows = getAllFlows();
  const entryDates = allFlows.map(f => f.date);

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flows_in_year"
        titleParams={{ year }}
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: flows.length }}
      />

      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} currentDate={`${year}-01-01`} />

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
        </div>
      </div>
    </div>
  );
}
