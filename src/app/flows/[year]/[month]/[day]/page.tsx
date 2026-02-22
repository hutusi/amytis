import { getAllFlows, getFlowBySlug, getAdjacentFlows, buildSlugRegistry, getBacklinks } from '@/lib/markdown';
import { siteConfig } from '../../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Backlinks from '@/components/Backlinks';
import ShareBar from '@/components/ShareBar';
import Link from 'next/link';

export function generateStaticParams() {
  const allFlows = getAllFlows();
  return allFlows.map(flow => {
    const [year, month, day] = flow.slug.split('/');
    return { year, month, day };
  });
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ year: string; month: string; day: string }> }): Promise<Metadata> {
  const { year, month, day } = await params;
  const flow = getFlowBySlug(`${year}/${month}/${day}`);
  if (!flow) return { title: 'Not Found' };
  return {
    title: `${flow.title} | ${resolveLocale(siteConfig.title)}`,
    description: flow.excerpt,
    openGraph: {
      title: flow.title,
      description: flow.excerpt,
      type: 'article',
      publishedTime: flow.date,
      url: `${siteConfig.baseUrl}/flows/${year}/${month}/${day}`,
      siteName: resolveLocale(siteConfig.title),
    },
    twitter: {
      card: 'summary',
      title: flow.title,
      description: flow.excerpt,
    },
  };
}

export default async function FlowPage({ params }: { params: Promise<{ year: string; month: string; day: string }> }) {
  const { year, month, day } = await params;
  const slug = `${year}/${month}/${day}`;
  const flow = getFlowBySlug(slug);
  if (!flow) notFound();

  const allFlows = getAllFlows();
  const entryDates = allFlows.map(f => f.date);
  const { prev, next } = getAdjacentFlows(flow.slug);
  const slugRegistry = buildSlugRegistry();
  const backlinks = getBacklinks(flow.slug);
  const flowUrl = `${siteConfig.baseUrl}/flows/${year}/${month}/${day}`;

  return (
    <div className="layout-main">
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
        <Link href={`/flows/${year}/${month}`} className="hover:text-accent no-underline">
          {month}
        </Link>
        <span className="text-muted/40">›</span>
        <span className="text-foreground">{day}</span>
      </nav>

      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} currentDate={flow.date} />

        <article className="flex-1 min-w-0">
          {/* Header */}
          <header className="mb-8">
            <time className="text-sm font-mono text-accent" data-pagefind-meta="date[content]">{flow.date}</time>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-heading">{flow.title}</h1>
          </header>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer content={flow.content} slugRegistry={slugRegistry} />
          </div>

          <Backlinks backlinks={backlinks} />

          <ShareBar url={flowUrl} title={flow.title} className="mt-8 mb-2" />

          {/* Prev/Next navigation */}
          <nav className="mt-12 pt-12 border-t border-muted/20 grid grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/flows/${prev.slug}`}
                className="group text-left no-underline"
              >
                <span className="text-xs text-muted">{t('older')}</span>
                <div className="text-sm font-medium text-heading group-hover:text-accent transition-colors truncate">
                  {prev.title}
                </div>
                <span className="text-xs font-mono text-muted">{prev.date}</span>
              </Link>
            ) : <div />}
            {next ? (
              <Link
                href={`/flows/${next.slug}`}
                className="group text-right no-underline"
              >
                <span className="text-xs text-muted">{t('newer')}</span>
                <div className="text-sm font-medium text-heading group-hover:text-accent transition-colors truncate">
                  {next.title}
                </div>
                <span className="text-xs font-mono text-muted">{next.date}</span>
              </Link>
            ) : <div />}
          </nav>
        </article>
      </div>
    </div>
  );
}
