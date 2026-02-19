import { getAllFlows, getFlowsByMonth, getFlowTags } from '@/lib/markdown';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowContent from '@/components/FlowContent';

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
  const tags = getFlowTags();
  const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flows_in_month"
        titleParams={{ month: monthLabel }}
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: flows.length }}
      />

      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-1.5 text-sm text-muted mb-6">
        <Link href="/flows" className="hover:text-accent no-underline">
          {t('all_flows')}
        </Link>
        <span className="text-muted/40">›</span>
        <Link href={`/flows/${year}`} className="hover:text-accent no-underline">
          {year}
        </Link>
        <span className="text-muted/40">›</span>
        <span className="text-foreground">{month}</span>
      </nav>

      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        currentDate={`${year}-${month}-01`}
      />
    </div>
  );
}
