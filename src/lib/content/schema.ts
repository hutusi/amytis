import { z } from 'zod';

/**
 * Frontmatter fields shared across the content domains (posts, notes, flows,
 * books). This is a leaf module that imports only zod, so reusing these in the
 * domain schemas introduces no dependency cycle — the content dependency-graph
 * guard tracks sibling (`./`) imports, and this module has none.
 *
 * `dateField` is the bare (required) transform; callers append `.optional()`
 * where the date may be absent (posts/notes/flows) and use it as-is where it is
 * required (books).
 */

/**
 * Accepts a string or Date and normalizes to a 'YYYY-MM-DD' string. The
 * `.refine()` is load-bearing: without it, a malformed date (e.g. a typo like
 * `2026-99-99`) makes the `.transform()` throw a raw `RangeError: Invalid Date`
 * that escapes `safeParse`, so the caller's `Invalid frontmatter in <file>`
 * handler never fires and the build error never names the offending file.
 * Refining first turns it into a normal validation failure the caller catches.
 */
export const dateField = z
  .union([z.string(), z.date()])
  .refine(val => !Number.isNaN(new Date(val).getTime()), {
    message: 'Invalid date: expected a valid date string (e.g. YYYY-MM-DD) or Date',
  })
  .transform(val => new Date(val).toISOString().split('T')[0]);

/** Optional draft flag; defaults to false. */
export const draftField = z.boolean().optional().default(false);

/** Optional tag list; defaults to []. */
export const tagsField = z.array(z.string()).optional().default([]);
