import { getAllFlows, getFlowBySlug, getAdjacentFlows, buildSlugRegistry, getBacklinks } from '@/lib/markdown';
import { siteConfig } from '../../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { t, resolveLocale } from '@/lib/i18n';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import Tag from '@/components/Tag';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Backlinks from '@/components/Backlinks';
import ShareBar from '@/components/ShareBar';
import Comments from '@/components/Comments';
import { resolveCommentable } from '@/lib/comments';
import Link from 'next/link';

export function generateStaticParams() {
  if (siteConfig.features?.flow?.enabled === false) return [{ year: '_', month: '_', day: '_' }];
  const allFlows = getAllFlows();
  if (allFlows.length === 0) return [{ year: '_', month: '_', day: '_' }];
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
  if (siteConfig.features?.flow?.enabled === false) notFound();
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

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
      <Link href="/flows" className="hover:text-accent no-underline shrink-0">
        {t('all_flows')}
      </Link>
      <span className="text-muted/40" aria-hidden="true">›</span>
      <Link href={`/flows/${year}`} className="hover:text-accent no-underline shrink-0">
        {year}
      </Link>
      <span className="text-muted/40" aria-hidden="true">›</span>
      <Link href={`/flows/${year}/${month}`} className="hover:text-accent no-underline shrink-0">
        {month}
      </Link>
      <span className="text-muted/40" aria-hidden="true">›</span>
      <span className="text-foreground shrink-0">{day}</span>
    </nav>
  );

  return (
    <div className="layout-main">
      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} currentDate={flow.date} breadcrumb={breadcrumb} />

        <article className="flex-1 min-w-0">
          {/* Header */}
          <header className="mb-8">
            <time className="text-base font-mono text-accent" data-pagefind-meta="date[content]">{flow.date}</time>
            {flow.title !== flow.date && (
              <h1 className="mt-2 text-xl sm:text-2xl font-serif font-bold text-heading">{flow.title}</h1>
            )}
            {flow.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {flow.tags.map(tag => (
                  <Tag key={tag} tag={tag} variant="default" />
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer content={flow.content} slug={`flows/${year}/${month}/${day}`} slugRegistry={slugRegistry} />
          </div>

          <Backlinks backlinks={backlinks} />

          <ShareBar url={flowUrl} title={flow.title} className="mt-8 mb-2" />

          {resolveCommentable(flow.commentable, 'flows') && (
            <Comments slug={`flows/${slug}`} postUrl={flowUrl} />
          )}

          {/* Prev/Next navigation */}
          <nav aria-label="Post navigation" className="mt-12 pt-12 border-t border-muted/20 grid grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/flows/${prev.slug}`}
                className="group text-left no-underline"
              >
                <span className="text-xs text-muted">{t('older')}</span>
                <div className="text-sm font-mono text-heading group-hover:text-accent transition-colors">
                  {prev.date}
                </div>
                {prev.title !== prev.date && (
                  <div className="text-sm text-muted group-hover:text-accent/80 transition-colors truncate">
                    {prev.title}
                  </div>
                )}
              </Link>
            ) : <div />}
            {next ? (
              <Link
                href={`/flows/${next.slug}`}
                className="group text-right no-underline"
              >
                <span className="text-xs text-muted">{t('newer')}</span>
                <div className="text-sm font-mono text-heading group-hover:text-accent transition-colors">
                  {next.date}
                </div>
                {next.title !== next.date && (
                  <div className="text-sm text-muted group-hover:text-accent/80 transition-colors truncate">
                    {next.title}
                  </div>
                )}
              </Link>
            ) : <div />}
          </nav>
        </article>
      </div>
    </div>
  );
}
