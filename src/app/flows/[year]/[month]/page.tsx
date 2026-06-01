import { getAllFlows, getFlowsByMonth, getFlowTags, buildSlugRegistry } from '@/lib/markdown';
import { siteConfig } from '../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowContent from '@/components/FlowContent';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export function generateStaticParams() {
  if (siteConfig.features?.flow?.enabled === false) return [{ year: '_', month: '_' }];
  const allFlows = getAllFlows();
  if (allFlows.length === 0) return [{ year: '_', month: '_' }];
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
  if (siteConfig.features?.flow?.enabled === false) notFound();
  const { year, month } = await params;
  const monthFlows = getFlowsByMonth(year, month);
  if (monthFlows.length === 0) notFound();

  const allFlows = getAllFlows();
  const slugRegistry = buildSlugRegistry();
  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();
  const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const flows = monthFlows.map(f => ({
    slug: f.slug,
    date: f.date,
    title: f.title,
    tags: f.tags,
    body: <MarkdownRenderer content={f.content} slug={`flows/${f.slug}`} slugRegistry={slugRegistry} />,
  }));

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted">
      <Link href="/flows" className="hover:text-accent no-underline">
        {t('all_flows')}
      </Link>
      <span className="text-muted/40" aria-hidden="true">›</span>
      <Link href={`/flows/${year}`} className="hover:text-accent no-underline">
        {year}
      </Link>
      <span className="text-muted/40" aria-hidden="true">›</span>
      <span className="text-foreground">{month}</span>
    </nav>
  );

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="flows_in_month"
        titleParams={{ month: monthLabel }}
        subtitleKey="flow_subtitle"
        subtitleParams={{ count: monthFlows.length }}
      />

      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        currentDate={`${year}-${month}-01`}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
