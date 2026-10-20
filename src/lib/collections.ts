import type { CollectionContext } from '@/lib/content/types';

/**
 * The collection a `?collection=<slug>` param selects for a post, or null
 * when the post is read in its own series context (no param, or a param
 * naming a collection the post doesn't belong to).
 */
export function resolveActiveCollection(
  contexts: CollectionContext[] | undefined,
  param: string | null,
): CollectionContext | null {
  if (!param) return null;
  return (contexts ?? []).find((context) => context.slug === param) ?? null;
}
