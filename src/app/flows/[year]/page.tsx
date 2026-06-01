import { getAllFlows, getFlowsByYear, getFlowTags, buildSlugRegistry } from '@/lib/markdown';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowContent from '@/components/FlowContent';
import MarkdownRenderer from '@/components/MarkdownRenderer';

export function generateStaticParams() {
  if (siteConfig.features?.flow?.enabled === false) return [{ year: '_' }];
  const allFlows = getAllFlows();
  if (allFlows.length === 0) return [{ year: '_' }];
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
  if (siteConfig.features?.flow?.enabled === false) notFound();
  const { year } = await params;
  const yearFlows = getFlowsByYear(year);
  if (yearFlows.length === 0) notFound();

  const allFlows = getAllFlows();
  const slugRegistry = buildSlugRegistry();
  const entryDates = allFlows.map(f => f.date);
  const tags = getFlowTags();

  const flows = yearFlows.map(f => ({
    slug: f.slug,
    date: f.date,
    title: f.title,
    tags: f.tags,
    body: <MarkdownRenderer content={f.content} slug={`flows/${f.slug}`} slugRegistry={slugRegistry} />,
  }));

  // Build month counts for this year
  const monthCounts: Record<string, number> = {};
  for (const flow of yearFlows) {
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
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/flows" className="hover:text-accent no-underline">
          {t('all_flows')}
        </Link>
        <span className="text-muted/40" aria-hidden="true">›</span>
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
        subtitleParams={{ count: yearFlows.length }}
      />

      <FlowContent
        flows={flows}
        entryDates={entryDates}
        tags={tags}
        currentDate={yearFlows[0]?.date}
        breadcrumb={breadcrumb}
      />
    </div>
  );
}
