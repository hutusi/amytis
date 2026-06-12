import { siteConfig } from '../../site.config';

export interface FlowMonthGroup<T extends { date: string }> {
  /** "YYYY-MM" */
  key: string;
  /** Human label, e.g. "March 2026" / "2026年3月" */
  label: string;
  flows: T[];
}

/** BCP-47 tag for build-time date formatting, derived from the site's default locale. */
export function flowStreamLocaleTag(): string {
  return siteConfig.i18n.defaultLocale === 'zh' ? 'zh-CN' : 'en-US';
}

/**
 * Group an already-sorted (newest-first) list of flows by calendar month,
 * preserving order. Grouping uses string math on the YYYY-MM-DD date so the
 * build machine's timezone can never shift an entry across a month boundary;
 * only the human-readable label touches Intl (pinned to UTC for the same
 * reason).
 */
export function groupFlowsByMonth<T extends { date: string }>(
  flows: T[],
  localeTag: string = flowStreamLocaleTag(),
): FlowMonthGroup<T>[] {
  const fmt = new Intl.DateTimeFormat(localeTag, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const groups: FlowMonthGroup<T>[] = [];
  for (const flow of flows) {
    const key = flow.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.flows.push(flow);
      continue;
    }
    groups.push({
      key,
      label: fmt.format(new Date(`${key}-01T00:00:00Z`)),
      flows: [flow],
    });
  }
  return groups;
}
