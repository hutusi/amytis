import { z } from 'zod';

/**
 * Frontmatter fields and validation-error helpers shared across the content
 * domains (posts, notes, flows, books).
 * This is a leaf module that imports only zod, so reusing these in the
 * domain schemas introduces no dependency cycle — the content dependency-graph
 * guard tracks sibling (`./`) imports, and this module has none.
 *
 * `dateField` is the bare (required) transform; callers append `.optional()`
 * where the date may be absent (posts/notes/flows) and use it as-is where it is
 * required (books).
 */

const CALENDAR_PREFIX_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})(?=$|[Tt\s])/;

/**
 * Normalize a frontmatter date to 'YYYY-MM-DD', or null when it is invalid.
 *
 * A string that starts with a calendar date (`2024-01-05`, `2024-1-5`,
 * `2024-01-05 07:00`, `2024-01-05T07:00:00+08:00`) keeps the day the author
 * wrote. Round-tripping it through `Date` would not: anything but a bare
 * ISO date parses as local time (or carries an offset), so `toISOString()`
 * lands on the previous UTC day for builds in UTC+ timezones, and local and
 * CI builds disagree. The rest of the string must still parse, so a typo
 * after the date fails the build instead of being dropped.
 *
 * Date objects (unquoted YAML timestamps) are already UTC instants and keep
 * the UTC calendar day.
 */
function normalizeDate(val: string | Date): string | null {
  if (typeof val === 'string') {
    const match = CALENDAR_PREFIX_RE.exec(val.trim());
    if (match) {
      const [prefix, y, m, d] = match;
      const year = Number(y);
      const month = Number(m);
      const day = Number(d);
      // setUTCFullYear, not Date.UTC: Date.UTC maps years 0–99 to 1900–1999.
      // Either rolls over (Feb 30 → Mar 2), so a mismatch means the calendar
      // date does not exist.
      const utc = new Date(0);
      utc.setUTCFullYear(year, month - 1, day);
      if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
        return null;
      }
      const normalized = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      const rest = val.trim().slice(prefix.length);
      if (rest && Number.isNaN(new Date(normalized + rest).getTime())) return null;
      return normalized;
    }
  }
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

/**
 * Accepts a string or Date and normalizes to a 'YYYY-MM-DD' string (see
 * `normalizeDate` for the timezone rules). The `.refine()` is load-bearing:
 * without it, a malformed date (e.g. a typo like `2026-99-99`) would make the
 * `.transform()` fail outside `safeParse`'s error channel, so the caller's
 * `Invalid frontmatter in <file>` handler never fires and the build error
 * never names the offending file. Refining first turns it into a normal
 * validation failure the caller catches.
 */
export const dateField = z
  .union([z.string(), z.date()])
  .refine(val => normalizeDate(val) !== null, {
    message: 'Invalid date: expected a valid date string (e.g. YYYY-MM-DD) or Date',
  })
  .transform(val => normalizeDate(val) as string);

/** Optional draft flag; defaults to false. */
export const draftField = z.boolean().optional().default(false);

/**
 * Drafts render in dev (so authors can preview them) and are dropped from
 * production builds. `nodeEnv` is injectable so the rule is testable without
 * flipping NODE_ENV under the env-keyed content memos.
 */
export function isDraftVisible(
  entry: { draft?: boolean },
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return !(nodeEnv === 'production' && entry.draft);
}

/** Optional tag list; defaults to []. */
export const tagsField = z.array(z.string()).optional().default([]);

/**
 * Build the error thrown when frontmatter fails Zod validation. The
 * field-level details are embedded in the message itself — not just
 * `console.error`'d — so CI logs that capture only the exception still name
 * the offending fields. `what` names the content kind, e.g. `'frontmatter'`
 * (posts), `'note frontmatter'`, `'book frontmatter'`.
 */
export function invalidFrontmatterError(
  what: string,
  fullPath: string,
  error: z.ZodError,
): Error {
  return new Error(
    `[amytis] Invalid ${what} in ${fullPath}: ${JSON.stringify(error.format())}`
  );
}
