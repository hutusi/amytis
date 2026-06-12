import { getAllFlows, getFlowsByYear } from '@/lib/content/flows';
import { buildSlugRegistry } from '@/lib/content/discovery';
import { isFeatureEnabled } from '@/lib/features';
import { toFlowIndexItems } from '@/lib/flow-stream';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { t, tWith, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';
import FlowIndexClient from '@/components/FlowIndexClient';
import FlowStream from '@/components/FlowStream';

export function generateStaticParams() {
  if (!isFeatureEnabled('flow')) return [{ year: '_' }];
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
  if (!isFeatureEnabled('flow')) notFound();
  const { year } = await params;
  const flows = getFlowsByYear(year);
  if (flows.length === 0) notFound();

  const allFlows = getAllFlows();
  const slugRegistry = buildSlugRegistry();

  // Tag counts scoped to this year, so the sidebar filter matches the feed.
  const tags: Record<string, number> = {};
  for (const flow of flows) {
    for (const tag of flow.tags) tags[tag] = (tags[tag] || 0) + 1;
  }

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
            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-full border border-ink/[0.08] text-foreground hover:border-accent hover:text-accent no-underline transition-colors"
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
        className="mb-12"
      />
      <FlowIndexClient
        allFlows={toFlowIndexItems(flows)}
        entryDates={allFlows.map(f => f.date)}
        tags={tags}
        currentDate={flows[0]?.date}
        breadcrumb={breadcrumb}
        feed={<FlowStream flows={flows} slugRegistry={slugRegistry} />}
      />
    </div>
  );
}
