'use client';

import { useState, useEffect } from 'react';
import {
  type ContentType,
  type ResultType,
  SEARCH_TYPE_FILTER,
  cleanTitle,
  getDateFromUrl,
  getResultType,
  isResultType,
} from '@/lib/search-utils';

/** A Pagefind hit mapped for display in the search modal. */
export interface DisplayResult {
  url: string;
  title: string;
  excerpt: string; // contains <mark> tags from Pagefind
  date: string;
  type: ResultType;
}

/** Hits per tab for the debounced query; `All` counts every hit. */
export type TypeCounts = Record<ContentType, number>;

const EMPTY_COUNTS: TypeCounts = { All: 0, Post: 0, Flow: 0, Book: 0, Note: 0 };

// Hits shown per tab. Only these load their fragment (`.data()`, one request
// each). The tab counts come from the search itself: every indexed page
// carries a `type` filter, and Pagefind reports how many hits have each value.
export const RESULTS_PER_TAB = 8;
const DEBOUNCE_MS = 150;

// ─── Pagefind loader ──────────────────────────────────────────────────────────
//
// We use `new Function` to create a runtime-only dynamic import so that
// neither webpack nor Turbopack tries to bundle /pagefind/pagefind.js at
// compile time (the file only exists after `pagefind --site out` runs).

export interface PagefindFragment {
  url: string;
  excerpt: string; // contains <mark> tags
  meta: { title?: string; image?: string; date?: string; [key: string]: string | undefined };
  /** data-pagefind-filter values, e.g. `{ type: ['Post'] }`. */
  filters?: Record<string, string[]>;
  word_count: number;
}

export interface PagefindSearch {
  results: Array<{ data: () => Promise<PagefindFragment> }>;
  /** Hits per filter value for this search, e.g. `{ type: { Post: 3 } }`. */
  filters?: Record<string, Record<string, number>>;
}

interface PagefindAPI {
  init: () => Promise<void>;
  destroy?: () => Promise<void>;
  /** Loads the filter index; returns the counts over every page. */
  filters?: () => Promise<Record<string, Record<string, number>>>;
  search: (q: string, options?: { filters?: Record<string, string> }) => Promise<PagefindSearch>;
}

/**
 * Map a Pagefind fragment to a display result. The date comes from the
 * page's `date` meta (a `<time datetime>` with data-pagefind-meta) and falls
 * back to the date encoded in the URL (flows): `||`, not `??`, because a meta
 * that matched no attribute is indexed as "". The type comes from the page's
 * `type` filter, or from the URL for an index built before pages carried one.
 */
export function toDisplayResult(fragment: PagefindFragment): DisplayResult {
  const indexedType = fragment.filters?.[SEARCH_TYPE_FILTER]?.[0];
  return {
    url: fragment.url,
    title: cleanTitle(fragment.meta.title ?? ''),
    excerpt: fragment.excerpt,
    date: fragment.meta.date || getDateFromUrl(fragment.url),
    type: indexedType && isResultType(indexedType) ? indexedType : getResultType(fragment.url),
  };
}

/** Tab counts from an unfiltered search. A stale index without type filters counts only `All`. */
export function countTypes(search: PagefindSearch): TypeCounts {
  const byType = search.filters?.[SEARCH_TYPE_FILTER] ?? {};
  return {
    All: search.results.length,
    Post: byType.Post ?? 0,
    Flow: byType.Flow ?? 0,
    Book: byType.Book ?? 0,
    Note: byType.Note ?? 0,
  };
}

const runtimeImport = new Function('path', 'return import(path)') as (p: string) => Promise<PagefindAPI>;
let importPagefind: () => Promise<PagefindAPI> = () => runtimeImport('/pagefind/pagefind.js');

let pagefindModule: PagefindAPI | null = null;
let initializedLang: string | null = null;
let inflight: { lang: string; promise: Promise<PagefindAPI | null> } | null = null;
// Loads run one at a time: destroy()/init() on the shared module must never
// interleave (a language switch while a load is still pending).
let loadQueue: Promise<unknown> = Promise.resolve();
let pagefindUnavailable = false;

/** The language Pagefind picks its index by: `<html lang>`, like its own init. */
function documentLang(): string {
  return (document.documentElement.getAttribute('lang') || 'unknown').toLowerCase();
}

/**
 * Load and initialize Pagefind for the page's current language. Pagefind
 * reads `<html lang>` once, at init, to choose the per-language index — and
 * the language switch is a client-side navigation that only rewrites the
 * attribute — so a cached instance from an English page would keep
 * searching the English index on the 中文 page. Re-initialize whenever the
 * language changed since the last init. Concurrent callers for the same
 * language share one load; loads for different languages queue behind each
 * other, and each clears only its own in-flight record.
 */
async function loadPagefind(): Promise<PagefindAPI | null> {
  if (pagefindUnavailable) return null;
  const lang = documentLang();
  if (inflight?.lang === lang) return inflight.promise;
  if (!inflight && pagefindModule && initializedLang === lang) return pagefindModule;

  const record: { lang: string; promise: Promise<PagefindAPI | null> } = { lang, promise: Promise.resolve(null) };
  record.promise = loadQueue.then(async () => {
    try {
      if (pagefindUnavailable) return null;
      pagefindModule ??= await importPagefind();
      if (initializedLang !== lang) {
        if (initializedLang !== null) await pagefindModule.destroy?.();
        await pagefindModule.init();
        // Searches report per-filter counts (the tab counts) only once the
        // filter index is loaded; until then `filters` comes back empty.
        await pagefindModule.filters?.();
        initializedLang = lang;
      }
      return pagefindModule;
    } catch {
      pagefindUnavailable = true;
      return null;
    } finally {
      if (inflight === record) inflight = null;
    }
  });
  inflight = record;
  loadQueue = record.promise;
  return record.promise;
}

/** Test seam: swap the runtime import and reset the module-level cache. */
export function __resetPagefindForTests(importer?: () => Promise<PagefindAPI>): void {
  importPagefind = importer ?? (() => runtimeImport('/pagefind/pagefind.js'));
  pagefindModule = null;
  initializedLang = null;
  inflight = null;
  loadQueue = Promise.resolve();
  pagefindUnavailable = false;
}

/**
 * Debounced Pagefind search over the static index, for the search modal.
 *
 * Debounces `query`, runs Pagefind on the debounced value, and maps the first
 * `RESULTS_PER_TAB` hits of the active type tab to `DisplayResult`s, with
 * exact per-tab counts. Pre-loads the Pagefind bundle whenever `isOpen`
 * becomes true (flipping `isUnavailable` if the index is missing) and fully
 * resets search state when it flips back to false.
 *
 * The active tab lives here because the search depends on it: a tab is picked
 * for one query, and any other query shows All.
 *
 * `onResultsReset` fires whenever the result set is replaced (fresh results,
 * a tab switch or a cleared query) so the caller can reset its selection
 * state. Pass a stable callback (`useCallback`) — it participates in the
 * search effect's dependencies, so a new identity per render would re-run
 * searches.
 */
export function usePagefind(
  query: string,
  isOpen: boolean,
  onResultsReset: () => void,
): {
  results: DisplayResult[];
  typeCounts: TypeCounts;
  activeType: ContentType;
  setActiveType: (type: ContentType) => void;
  isFetching: boolean;
  isUnavailable: boolean;
  isError: boolean;
  isTyping: boolean;
  debouncedQuery: string;
} {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<DisplayResult[]>([]);
  const [typeCounts, setTypeCounts] = useState<TypeCounts>(EMPTY_COUNTS);
  const [typeChoice, setTypeChoice] = useState<{ query: string; type: ContentType }>({ query: '', type: 'All' });
  const activeType = typeChoice.query === debouncedQuery ? typeChoice.type : 'All';
  const setActiveType = (type: ContentType) => setTypeChoice({ query: debouncedQuery, type });
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
  // threading conditional renders through every consumer of the results.
  useEffect(() => {
    if (!debouncedQuery) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setResults([]);
      setTypeCounts(EMPTY_COUNTS);
      setIsError(false);
      // Clearing the input mid-search cancels the in-flight request, whose
      // finally skips its own reset (cancelled), so reset here too — otherwise
      // isFetching stays true and the spinner never stops.
      setIsFetching(false);
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
        // The unfiltered search gives the counts for every tab; a type tab
        // then searches within its type. Both reuse the index chunks Pagefind
        // has already loaded, so only the shown hits' fragments are fetched.
        const all = await pf.search(debouncedQuery);
        const shown = activeType === 'All'
          ? all
          : await pf.search(debouncedQuery, { filters: { [SEARCH_TYPE_FILTER]: activeType } });
        const fragments = await Promise.all(
          shown.results.slice(0, RESULTS_PER_TAB).map((r) => r.data())
        );
        if (cancelled) return;
        setResults(fragments.map(toDisplayResult));
        setTypeCounts(countTypes(all));
        setIsError(false);
        onResultsReset();
      } catch {
        // A rejected search (Pagefind runtime error) previously went unhandled
        // and silently showed "no results". Surface a recoverable error instead.
        if (cancelled) return;
        setResults([]);
        setTypeCounts(EMPTY_COUNTS);
        setIsError(true);
        onResultsReset();
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    });

    return () => { cancelled = true; };
  }, [debouncedQuery, activeType, onResultsReset]);

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
    setResults([]);
    setTypeCounts(EMPTY_COUNTS);
    setTypeChoice({ query: '', type: 'All' });
    setIsFetching(false);
    setIsError(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen]);

  return { results, typeCounts, activeType, setActiveType, isFetching, isUnavailable, isError, isTyping, debouncedQuery };
}
