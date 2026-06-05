/**
 * Stable date comparators that return 0 on ties so equal-date items preserve
 * insertion order under V8's TimSort. Centralised here so every "newest-first"
 * or "oldest-first" sort in the codebase uses the same antisymmetric comparator.
 */

export function byDateDesc<T extends { date: string }>(a: T, b: T): number {
  if (a.date === b.date) return 0;
  return a.date < b.date ? 1 : -1;
}

export function byDateAsc<T extends { date: string }>(a: T, b: T): number {
  if (a.date === b.date) return 0;
  return a.date > b.date ? 1 : -1;
}
