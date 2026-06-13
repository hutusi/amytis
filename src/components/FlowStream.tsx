import { Fragment } from 'react';
import Link from 'next/link';
import Tag from '@/components/Tag';
import Pagination from '@/components/Pagination';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import MetaDot from '@/components/ui/MetaDot';
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
      <div className="relative border-l-2 border-ink/[0.08] pl-6 sm:pl-10 space-y-12">
        {groups.map(group => {
          const [groupYear, groupMonth] = group.key.split('-');
          return (
          <section key={group.key} className="relative">
            {/* Month node — hollow accent dot centered on the rail. Offset =
                left padding + 1px to reach the 2px border's center, then
                -translate-x-1/2 to center the dot (same math as /archive). */}
            <div
              className="absolute -left-[calc(1.5rem+1px)] sm:-left-[calc(2.5rem+1px)] -translate-x-1/2 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-accent/50"
              aria-hidden="true"
            />
            <h2 className="text-base font-sans font-bold uppercase tracking-widest mb-6">
              {group.labelParts
                .filter(seg => seg.text.trim().length > 0)
                .map((seg, i) => (
                  <Fragment key={i}>
                    {/* Dot separator (PostCard meta vocabulary) makes the two
                        click targets visibly distinct; spacing comes from its
                        margins, so segment texts render trimmed. */}
                    {i > 0 && <MetaDot className="mx-2 inline-block align-middle" />}
                    {seg.link ? (
                      <Link
                        href={seg.link === 'year' ? `/flows/${groupYear}` : `/flows/${groupYear}/${groupMonth}`}
                        className="no-underline text-accent hover:text-accent-hover transition-colors"
                      >
                        {seg.text.trim()}
                      </Link>
                    ) : (
                      <span className="text-accent">{seg.text.trim()}</span>
                    )}
                  </Fragment>
                ))}
              <span className="ml-2 inline-flex items-center text-[10px] font-mono text-muted bg-ink/[0.05] rounded px-1.5 py-0.5 align-middle leading-none">
                {group.flows.length}
              </span>
            </h2>

            <div className="space-y-8">
            {group.flows.map(flow => (
              <article key={flow.slug} className="flow-card">
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
                  <div className="mt-6 border-t border-ink/[0.05] pt-4 flex flex-wrap gap-2">
                    {flow.tags.map(tag => (
                      <Tag key={tag} tag={tag} variant="compact" />
                    ))}
                  </div>
                )}
              </article>
            ))}
            </div>
          </section>
          );
        })}
      </div>

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
