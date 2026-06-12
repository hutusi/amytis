import Link from 'next/link';
import Tag from '@/components/Tag';
import Pagination from '@/components/Pagination';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { groupFlowsByMonth, flowStreamLocaleTag } from '@/lib/flow-stream';
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
 * Continuous reading view: full flow content in a single centered column,
 * grouped under month dividers. Server component — markdown renders at build
 * time through the same pipeline as the flow detail page.
 */
export default function FlowStream({ flows, slugRegistry, pagination }: FlowStreamProps) {
  const groups = groupFlowsByMonth(flows);
  const weekdayFmt = new Intl.DateTimeFormat(flowStreamLocaleTag(), {
    weekday: 'long',
    timeZone: 'UTC',
  });

  return (
    <div className="max-w-2xl mx-auto">
      {groups.map(group => (
        <section key={group.key}>
          <div className="flex items-center gap-4 mt-16 first:mt-0 mb-10">
            <h2 className="shrink-0 text-xs font-mono uppercase tracking-[0.2em] text-muted">
              {group.label}
            </h2>
            <div className="flex-1 h-px bg-muted/15" aria-hidden="true" />
          </div>

          <div className="space-y-16">
            {group.flows.map(flow => (
              <article key={flow.slug}>
                <header className="mb-4">
                  <Link href={`/flows/${flow.slug}`} className="group/date no-underline">
                    <time
                      dateTime={flow.date}
                      className="text-sm font-mono text-accent group-hover/date:text-accent-hover transition-colors"
                    >
                      {flow.date}
                    </time>
                    <span className="ml-2 text-xs text-muted/60">
                      {weekdayFmt.format(new Date(flow.date))}
                    </span>
                  </Link>
                  {flow.title !== flow.date && (
                    <h3 className="mt-1.5 text-xl font-serif font-bold text-heading">
                      <Link
                        href={`/flows/${flow.slug}`}
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
                  <div className="mt-4 flex flex-wrap gap-2">
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
        <div className="mt-16">
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
