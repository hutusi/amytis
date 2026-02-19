import { getAllFlows, getFlowsByYear, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
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
  const tags = getFlowTags();

  // Build month counts for this year
  const monthCounts: Record<string, number> = {};
  for (const flow of flows) {
    const month = flow.date.split('-')[1];
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  }
  const sortedMonths = Object.keys(monthCounts).sort();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flows_in_year"
        titleParams={{ year }}
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: flows.length }}
      />

      {/* Month navigation pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link href="/flows" className="text-sm text-muted hover:text-accent no-underline">
          ← {t('all_flows')}
        </Link>
        <span className="text-muted/30">|</span>
        {sortedMonths.map(m => (
          <Link
            key={m}
            href={`/flows/${year}/${m}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-muted/20 text-foreground hover:border-accent hover:text-accent no-underline transition-colors"
          >
            {monthNames[parseInt(m, 10) - 1]}
            <span className="text-muted text-[10px]">({monthCounts[m]})</span>
          </Link>
        ))}
      </div>

      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} currentDate={`${year}-01-01`} tags={tags} />

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
