/**
 * Shared pagination math for paginated listing routes.
 *
 * Deliberately small: `generateStaticParams` / `generateMetadata` / page
 * components stay literal exports in each route file (Next.js statically
 * analyzes them; a route factory would fight the framework). Routes call
 * these helpers for the math and keep their own rendering.
 */

export interface PageSlice<T> {
  items: T[];
  page: number;
  /** Clamped to >= 1 so page 1 of an empty listing is still a valid (empty) page. */
  totalPages: number;
  /** Index of the first item on this page (for numbered catalogs). */
  start: number;
}

/** Slice one page out of a full list. Returns null for invalid/out-of-range pages → notFound(). */
export function paginate<T>(all: T[], page: number, pageSize: number): PageSlice<T> | null {
  if (!Number.isInteger(page) || page < 1) return null;
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  if (page > totalPages) return null;
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), page, totalPages, start };
}

/**
 * Static params for a `page/[page]` route: pages 2..N (page 1 is the index
 * route). Never returns [] — `output: "export"` requires at least one param,
 * so single-page and disabled listings emit a sentinel that the page body
 * 404s via its bounds check (`dynamicParams = false` keeps everything else out).
 */
export function paginationStaticParams(
  totalItems: number,
  pageSize: number,
  opts: { enabled?: boolean; disabledSentinel?: string } = {},
): { page: string }[] {
  if (opts.enabled === false) return [{ page: opts.disabledSentinel ?? '2' }];
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return [{ page: '2' }];
  return Array.from({ length: totalPages - 1 }, (_, i) => ({ page: (i + 2).toString() }));
}
