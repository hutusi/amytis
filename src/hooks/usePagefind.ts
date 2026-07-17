'use client';

import { useState, useEffect } from 'react';
import { type ContentType, getResultType, getDateFromUrl, cleanTitle } from '@/lib/search-utils';

/** A Pagefind hit mapped for display in the search modal. */
export interface DisplayResult {
  url: string;
  title: string;
  excerpt: string; // contains <mark> tags from Pagefind
  date: string;
  type: Exclude<ContentType, 'All'>;
}

// Load the full match set (bounded) so per-type counts and tabs reflect every
// result, not just the first page — a 24-hit cap could hide a whole content
// type when one type dominates the ranking. Display is capped separately by the
// consumer. The bound guards a pathological match count on large indexes; a
// personal-blog query never approaches it, so counts are exact in practice.
const MAX_INDEXED_RESULTS = 100;
const DEBOUNCE_MS = 150;

// ─── Pagefind loader ──────────────────────────────────────────────────────────
//
// We use `new Function` to create a runtime-only dynamic import so that
// neither webpack nor Turbopack tries to bundle /pagefind/pagefind.js at
// compile time (the file only exists after `pagefind --site out` runs).

interface PagefindFragment {
  url: string;
  excerpt: string; // contains <mark> tags
  meta: { title?: string; image?: string; date?: string; [key: string]: string | undefined };
  word_count: number;
}

interface PagefindAPI {
  init: () => Promise<void>;
  search: (q: string) => Promise<{ results: Array<{ data: () => Promise<PagefindFragment> }> }>;
}

let pagefindCache: PagefindAPI | null = null;
let pagefindUnavailable = false;

async function loadPagefind(): Promise<PagefindAPI | null> {
  if (pagefindCache) return pagefindCache;
  if (pagefindUnavailable) return null;
  try {
    const load = new Function('path', 'return import(path)') as (p: string) => Promise<PagefindAPI>;
    const pf = await load('/pagefind/pagefind.js');
    await pf.init();
    pagefindCache = pf;
    return pf;
  } catch {
    pagefindUnavailable = true;
    return null;
  }
}

/**
 * Debounced Pagefind search over the static index, for the search modal.
 *
 * Debounces `query`, runs Pagefind on the debounced value, and maps the
 * fragments to `DisplayResult`s. Pre-loads the Pagefind bundle whenever
 * `isOpen` becomes true (flipping `isUnavailable` if the index is missing)
 * and fully resets search state when it flips back to false.
 *
 * `onResultsReset` fires whenever the result set is replaced (fresh results
 * or a cleared query) so the caller can reset its selection state. Pass a
 * stable callback (`useCallback`) — it participates in the search effect's
 * dependencies, so a new identity per render would re-run searches.
 */
export function usePagefind(
  query: string,
  isOpen: boolean,
  onResultsReset: () => void,
): {
  allResults: DisplayResult[];
  isFetching: boolean;
  isUnavailable: boolean;
  isError: boolean;
  isTyping: boolean;
  debouncedQuery: string;
} {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allResults, setAllResults] = useState<DisplayResult[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  // Recoverable: a rejected search (vs. a missing index) — the user can retry.
  const [isError, setIsError] = useState(false);

  // True while debounce is pending — suppress "no results" flash
  const isTyping = query.length > 0 && query !== debouncedQuery;

  // Pre-load Pagefind when the modal first opens
  useEffect(() => {
    if (isOpen) {
      loadPagefind().then((pf) => { if (!pf) setIsUnavailable(true); });
    }
  }, [isOpen]);

  // Debounce query. The sync reset when `query` is empty is intentional:
  // skipping it would leave stale results visible for DEBOUNCE_MS after the
  // user clears the input.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!query) { setDebouncedQuery(''); return; }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Run Pagefind search on debounced query. Synchronous resets when the
  // query becomes empty are the simplest way to clear results state without
  // threading conditional renders through every consumer of allResults.
  useEffect(() => {
    if (!debouncedQuery) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setAllResults([]);
      setIsError(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      onResultsReset();
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setIsError(false);

    loadPagefind().then(async (pf) => {
      if (!pf || cancelled) { setIsFetching(false); return; }
      try {
        const search = await pf.search(debouncedQuery);
        const fragments = await Promise.all(
          search.results.slice(0, MAX_INDEXED_RESULTS).map((r) => r.data())
        );
        if (cancelled) return;
        setAllResults(
          fragments.map((f: PagefindFragment) => ({
            url: f.url,
            title: cleanTitle(f.meta.title ?? ''),
            excerpt: f.excerpt,
            date: f.meta.date ?? getDateFromUrl(f.url),
            type: getResultType(f.url),
          }))
        );
        setIsError(false);
        onResultsReset();
      } catch {
        // A rejected search (Pagefind runtime error) previously went unhandled
        // and silently showed "no results". Surface a recoverable error instead.
        if (cancelled) return;
        setAllResults([]);
        setIsError(true);
        onResultsReset();
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    });

    return () => { cancelled = true; };
  }, [debouncedQuery, onResultsReset]);

  // Full reset on close. `isFetching` must be forced off here: a search
  // in flight during close is cancelled, and its own setIsFetching(false)
  // is suppressed by the `cancelled` flag. The resets are batched with the
  // caller's own close resets into a single React render — the rule's
  // "cascading renders" warning doesn't apply when state changes are
  // batched as siblings, only when one update triggers the next.
  useEffect(() => {
    if (isOpen) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setDebouncedQuery('');
    setAllResults([]);
    setIsFetching(false);
    setIsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen]);

  return { allResults, isFetching, isUnavailable, isError, isTyping, debouncedQuery };
}
