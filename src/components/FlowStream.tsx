import Link from 'next/link';
import Tag from '@/components/Tag';
import Pagination from '@/components/Pagination';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { groupFlowsByMonth, flowStreamLocaleTag } from '@/lib/flow-stream';
import { getFlowUrl } from '@/lib/urls';
import type { FlowData } from '@/lib/content/flows';
import type { SlugRegistryEntry } from '@/lib/content/discovery';

interface FlowStreamProps {
  flows: FlowData[];
  slugRegistry: Map<string, SlugRegistryEntry>;
  pagination?: {
    currentPage: number;
    totalPages: number;
    basePath: string;
  };
}

/**
 * Full-content card feed on the flow index, grouped under month dividers.
 * Server component — markdown renders at build time through the same
 * pipeline as the flow detail page. Column width comes from the parent.
 */
export default function FlowStream({ flows, slugRegistry, pagination }: FlowStreamProps) {
  const groups = groupFlowsByMonth(flows);
  const weekdayFmt = new Intl.DateTimeFormat(flowStreamLocaleTag(), {
    weekday: 'long',
    timeZone: 'UTC',
  });

  return (
    <div>
      {groups.map(group => (
        <section key={group.key}>
          <div className="flex items-center gap-4 mt-12 first:mt-0 mb-6">
            <h2 className="shrink-0 text-xs font-mono uppercase tracking-[0.2em] text-muted">
              {group.label}
            </h2>
            <div className="flex-1 h-px bg-muted/15" aria-hidden="true" />
          </div>

          <div className="space-y-8">
            {group.flows.map(flow => (
              <article
                key={flow.slug}
                className="rounded-2xl border border-muted/15 bg-muted/5 p-6 sm:p-8 shadow-[0_1px_3px_rgb(0_0_0/0.04)]"
              >
                <header className="mb-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <Link href={getFlowUrl(flow.slug)} className="group/date no-underline min-w-0">
                      <time
                        dateTime={flow.date}
                        className="text-sm font-mono text-accent group-hover/date:text-accent-hover transition-colors"
                      >
                        {flow.date}
                      </time>
                      <span className="ml-2 text-xs text-muted/60">
                        {weekdayFmt.format(new Date(`${flow.date}T00:00:00Z`))}
                      </span>
                    </Link>
                    {/* Duplicate of the date permalink — kept out of the tab
                        order and the accessibility tree on purpose. */}
                    <Link
                      href={getFlowUrl(flow.slug)}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="shrink-0 no-underline text-base leading-none text-muted/40 hover:text-accent transition-colors"
                    >
                      →
                    </Link>
                  </div>
                  {flow.title !== flow.date && (
                    <h3 className="mt-2 text-xl font-serif font-bold text-heading">
                      <Link
                        href={getFlowUrl(flow.slug)}
                        className="no-underline hover:text-accent transition-colors"
                      >
                        {flow.title}
                      </Link>
                    </h3>
                  )}
                </header>

                <MarkdownRenderer
                  content={flow.content}
                  slug={`flows/${flow.slug}`}
                  slugRegistry={slugRegistry}
                  headingIdPrefix={`f-${flow.slug.replaceAll('/', '-')}-`}
                />

                {flow.tags.length > 0 && (
                  <div className="mt-6 border-t border-muted/10 pt-4 flex flex-wrap gap-2">
                    {flow.tags.map(tag => (
                      <Tag key={tag} tag={tag} variant="compact" />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-12">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            basePath={pagination.basePath}
          />
        </div>
      )}
    </div>
  );
}
