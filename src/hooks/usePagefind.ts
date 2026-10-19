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

export interface PagefindFragment {
  url: string;
  excerpt: string; // contains <mark> tags
  meta: { title?: string; image?: string; date?: string; [key: string]: string | undefined };
  word_count: number;
}

interface PagefindAPI {
  init: () => Promise<void>;
  destroy?: () => Promise<void>;
  search: (q: string) => Promise<{ results: Array<{ data: () => Promise<PagefindFragment> }> }>;
}

/**
 * Map a Pagefind fragment to a display result. The date comes from the
 * page's `date` meta (a `<time datetime>` with data-pagefind-meta) and falls
 * back to the date encoded in the URL (flows): `||`, not `??`, because a meta
 * that matched no attribute is indexed as "".
 */
export function toDisplayResult(fragment: PagefindFragment): DisplayResult {
  return {
    url: fragment.url,
    title: cleanTitle(fragment.meta.title ?? ''),
    excerpt: fragment.excerpt,
    date: fragment.meta.date || getDateFromUrl(fragment.url),
    type: getResultType(fragment.url),
  };
}

const runtimeImport = new Function('path', 'return import(path)') as (p: string) => Promise<PagefindAPI>;
let importPagefind: () => Promise<PagefindAPI> = () => runtimeImport('/pagefind/pagefind.js');

let pagefindModule: PagefindAPI | null = null;
let initializedLang: string | null = null;
let inflight: { lang: string; promise: Promise<PagefindAPI | null> } | null = null;
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
 * language changed since the last init; concurrent callers share one load.
 */
async function loadPagefind(): Promise<PagefindAPI | null> {
  if (pagefindUnavailable) return null;
  const lang = documentLang();
  if (pagefindModule && initializedLang === lang) return pagefindModule;
  if (inflight && inflight.lang === lang) return inflight.promise;

  const promise = (async () => {
    try {
      pagefindModule ??= await importPagefind();
      if (initializedLang !== null && initializedLang !== lang) {
        await pagefindModule.destroy?.();
      }
      await pagefindModule.init();
      initializedLang = lang;
      return pagefindModule;
    } catch {
      pagefindUnavailable = true;
      return null;
    } finally {
      inflight = null;
    }
  })();
  inflight = { lang, promise };
  return promise;
}

/** Test seam: swap the runtime import and reset the module-level cache. */
export function __resetPagefindForTests(importer?: () => Promise<PagefindAPI>): void {
  importPagefind = importer ?? (() => runtimeImport('/pagefind/pagefind.js'));
  pagefindModule = null;
  initializedLang = null;
  inflight = null;
  pagefindUnavailable = false;
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
        const search = await pf.search(debouncedQuery);
        const fragments = await Promise.all(
          search.results.slice(0, MAX_INDEXED_RESULTS).map((r) => r.data())
        );
        if (cancelled) return;
        setAllResults(fragments.map(toDisplayResult));
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
