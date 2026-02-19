import { getAllFlows, getFlowsByMonth } from '@/lib/markdown';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';

export function generateStaticParams() {
  const allFlows = getAllFlows();
  const monthSet = new Set(allFlows.map(f => {
    const [year, month] = f.slug.split('/');
    return `${year}/${month}`;
  }));
  return Array.from(monthSet).map(ym => {
    const [year, month] = ym.split('/');
    return { year, month };
  });
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ year: string; month: string }> }): Promise<Metadata> {
  const { year, month } = await params;
  const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return {
    title: `${tWith('flows_in_month', { month: monthLabel })} | ${resolveLocale(siteConfig.title)}`,
  };
}

export default async function FlowsMonthPage({ params }: { params: Promise<{ year: string; month: string }> }) {
  const { year, month } = await params;
  const flows = getFlowsByMonth(year, month);
  if (flows.length === 0) notFound();

  const allFlows = getAllFlows();
  const entryDates = allFlows.map(f => f.date);
  const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flows_in_month"
        titleParams={{ month: monthLabel }}
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: flows.length }}
      />

      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} currentDate={`${year}-${month}-01`} />

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
