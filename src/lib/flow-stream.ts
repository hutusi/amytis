import { siteConfig } from '../../site.config';

export interface FlowIndexItem {
  slug: string;
  date: string;
  title?: string;
  excerpt: string;
  tags: string[];
}

/**
 * Shape full FlowData records into the light items FlowIndexClient filters
 * on (drops content/headings). Shared by all four flow index routes so
 * their prop shape can't drift.
 */
export function toFlowIndexItems<T extends FlowIndexItem>(flows: T[]): FlowIndexItem[] {
  return flows.map(({ slug, date, title, excerpt, tags }) => ({ slug, date, title, excerpt, tags }));
}

export interface FlowMonthLabelSegment {
  text: string;
  /** Which archive this segment anchors to; null for plain literals. */
  link: 'month' | 'year' | null;
}

export interface FlowMonthGroup<T extends { date: string }> {
  /** "YYYY-MM" */
  key: string;
  /** Human label, e.g. "March 2026" / "2026年3月" */
  label: string;
  /**
   * The label split into locale-ordered segments so the month part can
   * anchor to the month archive and the year part to the year archive
   * (en: "March " | "2026"; zh: "2026年" | "3月"). Joining the segment
   * texts always reproduces `label`.
   */
  labelParts: FlowMonthLabelSegment[];
  flows: T[];
}

/**
 * Fold Intl.formatToParts output into linkable segments: a year/month part
 * starts a new segment; literals merge into the preceding segment (so the
 * zh "年"/"月" suffixes stay inside their anchor); a leading literal
 * becomes a plain segment.
 */
function toLabelSegments(parts: Intl.DateTimeFormatPart[]): FlowMonthLabelSegment[] {
  const segments: FlowMonthLabelSegment[] = [];
  for (const part of parts) {
    if (part.type === 'year' || part.type === 'month') {
      segments.push({ text: part.value, link: part.type });
    } else if (segments.length > 0) {
      segments[segments.length - 1].text += part.value;
    } else {
      segments.push({ text: part.value, link: null });
    }
  }
  return segments;
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
    const monthDate = new Date(`${key}-01T00:00:00Z`);
    groups.push({
      key,
      label: fmt.format(monthDate),
      labelParts: toLabelSegments(fmt.formatToParts(monthDate)),
      flows: [flow],
    });
  }
  return groups;
}
