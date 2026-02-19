import { getAllFlows, getFlowBySlug, getAdjacentFlows } from '@/lib/markdown';
import { siteConfig } from '../../../../../../site.config';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveLocale } from '@/lib/i18n';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Tag from '@/components/Tag';
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

  return (
    <div className="layout-main">
      <div className="flex gap-10">
        <FlowCalendarSidebar entryDates={entryDates} currentDate={flow.date} />

        <article className="flex-1 min-w-0">
          {/* Header */}
          <header className="mb-8">
            <time className="text-sm font-mono text-accent">{flow.date}</time>
            <h1 className="mt-2 text-3xl md:text-4xl font-serif font-bold text-heading">{flow.title}</h1>
            {flow.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {flow.tags.map(tag => (
                  <Tag key={tag} tag={tag} />
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <MarkdownRenderer content={flow.content} />
          </div>

          {/* Prev/Next navigation */}
          <nav className="mt-16 pt-8 border-t border-muted/20 grid grid-cols-2 gap-4">
            {prev ? (
              <Link
                href={`/flows/${prev.slug}`}
                className="group text-left no-underline"
              >
                <span className="text-xs text-muted">Older</span>
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
                <span className="text-xs text-muted">Newer</span>
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
