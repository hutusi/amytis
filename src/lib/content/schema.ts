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

/** Accepts a string or Date and normalizes to a 'YYYY-MM-DD' string. */
export const dateField = z
  .union([z.string(), z.date()])
  .transform(val => new Date(val).toISOString().split('T')[0]);

/** Optional draft flag; defaults to false. */
export const draftField = z.boolean().optional().default(false);

/** Optional tag list; defaults to []. */
export const tagsField = z.array(z.string()).optional().default([]);
