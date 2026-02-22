import { getAllFlows, getFlowsByYear, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowContent from '@/components/FlowContent';

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

  const breadcrumb = (
    <div className="space-y-2">
      <nav className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/flows" className="hover:text-accent no-underline">
          {t('all_flows')}
        </Link>
        <span className="text-muted/40">›</span>
        <span className="text-foreground">{year}</span>
      </nav>
      <div className="flex flex-wrap gap-1.5">
        {sortedMonths.map(m => (
          <Link
            key={m}
            href={`/flows/${year}/${m}`}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full border border-muted/20 text-foreground hover:border-accent hover:text-accent no-underline transition-colors"
          >
            {monthNames[parseInt(m, 10) - 1]}
            <span className="text-muted text-[10px]">({monthCounts[m]})</span>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flows_in_year"
        titleParams={{ year }}
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: flows.length }}
      />

      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        currentDate={`${year}-01-01`}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
