import { describe, test, expect, jest, afterEach, mock } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import {
  __resetPagefindForTests,
  countTypes,
  RESULTS_PER_TAB,
  toDisplayResult,
  usePagefind,
  type PagefindFragment,
  type PagefindSearch,
} from '@/hooks/usePagefind';

/**
 * Pagefind itself never loads in this environment (the runtime dynamic import
 * of /pagefind/pagefind.js rejects), so its promise stays pending across the
 * synchronous debounce flip below — exactly the "search in-flight" state the
 * regression needs. Fake timers drive the 150ms debounce deterministically.
 */
describe('usePagefind', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('resets isFetching when the query is cleared mid-search', () => {
    jest.useFakeTimers();
    const noop = () => {};
    let query = 'test';
    const { result, rerender } = renderHook(() => usePagefind(query, true, noop));

    // Advance past the debounce so the search effect runs: isFetching flips
    // true and loadPagefind() is left pending (its import never resolves here).
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.isFetching).toBe(true);

    // Clear the input. The debounce resets debouncedQuery to '' synchronously,
    // re-running the search effect into its empty branch. Before the fix the
    // in-flight search's cancelled finally skipped the reset and this branch
    // didn't reset either, leaving the spinner stuck on.
    query = '';
    act(() => {
      rerender();
    });
    expect(result.current.isFetching).toBe(false);
  });
});

describe('toDisplayResult', () => {
  const base = { excerpt: 'x', word_count: 1 };

  test('uses the indexed date meta', () => {
    const r = toDisplayResult({ ...base, url: '/posts/a/', meta: { title: 'A | Site', date: '2026-01-02' } });
    expect(r).toMatchObject({ title: 'A', date: '2026-01-02', type: 'Post' });
  });

  test('falls back to the URL date when the meta is empty, not just missing', () => {
    // A data-pagefind-meta that matched no attribute is indexed as "".
    expect(toDisplayResult({ ...base, url: '/flows/2026/03/04/', meta: { date: '' } }).date).toBe('2026-03-04');
    expect(toDisplayResult({ ...base, url: '/flows/2026/03/04/', meta: {} }).date).toBe('2026-03-04');
  });

  test('takes the type from the indexed filter, falling back to the URL', () => {
    // A post under a custom base path whose URL reads like a flow.
    expect(toDisplayResult({ ...base, url: '/flows-of-thought/a/', meta: {}, filters: { type: ['Note'] } }).type).toBe('Note');
    expect(toDisplayResult({ ...base, url: '/books/x/', meta: {}, filters: { type: ['Bogus'] } }).type).toBe('Book');
    expect(toDisplayResult({ ...base, url: '/books/x/', meta: {} }).type).toBe('Book');
  });
});

describe('countTypes', () => {
  const hits = (n: number) => ({ results: Array.from({ length: n }, () => ({ data: async () => ({}) as PagefindFragment })) });

  test('counts every hit for All and each type from the filter counts', () => {
    expect(countTypes({ ...hits(5), filters: { type: { Post: 3, Flow: 2 } } }))
      .toEqual({ All: 5, Post: 3, Flow: 2, Book: 0, Note: 0 });
  });

  test('an index without type filters still counts All', () => {
    expect(countTypes(hits(4))).toEqual({ All: 4, Post: 0, Flow: 0, Book: 0, Note: 0 });
  });
});

describe('usePagefind type tabs', () => {
  afterEach(() => __resetPagefindForTests());

  // 20 posts and 3 flows, all matching every query.
  const PAGES = [
    ...Array.from({ length: 20 }, (_, i) => ({ url: `/posts/p${i}/`, type: 'Post' })),
    ...Array.from({ length: 3 }, (_, i) => ({ url: `/flows/2026/01/0${i + 1}/`, type: 'Flow' })),
  ];

  function fakeIndex() {
    const loaded: string[] = [];
    // Like Pagefind: searches report filter counts only after filters() loads the filter index.
    let filtersLoaded = false;
    const filters = mock(async () => { filtersLoaded = true; return {}; });
    const search = mock(async (_q: string, options?: { filters?: Record<string, string> }): Promise<PagefindSearch> => {
      const pages = PAGES.filter((p) => !options?.filters?.type || p.type === options.filters.type);
      const byType: Record<string, number> = {};
      for (const p of pages) byType[p.type] = (byType[p.type] ?? 0) + 1;
      return {
        results: pages.map((p) => ({
          data: async () => {
            loaded.push(p.url);
            return { url: p.url, excerpt: '', meta: { title: p.url }, filters: { type: [p.type] }, word_count: 1 };
          },
        })),
        filters: filtersLoaded ? { type: byType } : {},
      };
    });
    __resetPagefindForTests(async () => ({ init: async () => {}, destroy: async () => {}, filters, search }));
    return { search, filters, loaded };
  }

  const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 200)); });

  test('loads only the shown hits and counts every hit per type', async () => {
    const { loaded, filters } = fakeIndex();
    const noop = () => {};
    const { result } = renderHook(() => usePagefind('q', true, noop));
    await settle();

    expect(filters).toHaveBeenCalledTimes(1);
    expect(result.current.typeCounts).toEqual({ All: 23, Post: 20, Flow: 3, Book: 0, Note: 0 });
    expect(result.current.results).toHaveLength(RESULTS_PER_TAB);
    expect(loaded).toHaveLength(RESULTS_PER_TAB);
  });

  test('a type tab searches within its type and keeps the counts', async () => {
    const { search, loaded } = fakeIndex();
    const noop = () => {};
    const { result } = renderHook(() => usePagefind('q', true, noop));
    await settle();
    loaded.length = 0;

    act(() => result.current.setActiveType('Flow'));
    await settle();

    expect(result.current.activeType).toBe('Flow');
    expect(search).toHaveBeenLastCalledWith('q', { filters: { type: 'Flow' } });
    expect(result.current.results.map((r) => r.type)).toEqual(['Flow', 'Flow', 'Flow']);
    expect(loaded).toHaveLength(3);
    expect(result.current.typeCounts.All).toBe(23);
  });

  test('a new query falls back to All', async () => {
    fakeIndex();
    const noop = () => {};
    let query = 'q';
    const { result, rerender } = renderHook(() => usePagefind(query, true, noop));
    await settle();
    act(() => result.current.setActiveType('Flow'));
    await settle();

    query = 'q2';
    rerender();
    await settle();

    expect(result.current.activeType).toBe('All');
    expect(result.current.results).toHaveLength(RESULTS_PER_TAB);
  });
});

describe('usePagefind language handling', () => {
  afterEach(() => {
    __resetPagefindForTests();
    document.documentElement.setAttribute('lang', 'en');
  });

  function fakePagefind() {
    const calls: string[] = [];
    const api = {
      init: mock(async () => { calls.push(`init:${document.documentElement.lang}`); }),
      destroy: mock(async () => { calls.push('destroy'); }),
      search: mock(async () => ({ results: [] })),
    };
    __resetPagefindForTests(async () => api);
    return { api, calls };
  }

  const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  test('initializes once per language and re-initializes after a switch', async () => {
    const { api, calls } = fakePagefind();
    document.documentElement.setAttribute('lang', 'en');
    const noop = () => {};
    let query = '';
    const { rerender } = renderHook(() => usePagefind(query, true, noop));
    await flush();
    expect(calls).toEqual(['init:en']);

    // Same language: the cached instance is reused.
    query = 'react';
    rerender();
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(calls).toEqual(['init:en']);
    expect(api.search).toHaveBeenCalledTimes(1);

    // Client-side language switch rewrites <html lang>; the next search must
    // tear down and re-init so Pagefind loads the zh index.
    document.documentElement.setAttribute('lang', 'zh');
    query = '测试';
    rerender();
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(calls).toEqual(['init:en', 'destroy', 'init:zh']);
    expect(api.search).toHaveBeenCalledTimes(2);
  });

  test('a language switch during a pending load queues instead of overlapping init()', async () => {
    let active = 0;
    let maxActive = 0;
    const inits: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((r) => { releaseFirst = r; });
    const api = {
      init: mock(async () => {
        active++; maxActive = Math.max(maxActive, active);
        inits.push(document.documentElement.lang);
        if (inits.length === 1) await firstGate;
        active--;
      }),
      destroy: mock(async () => {}),
      search: mock(async () => ({ results: [] })),
    };
    __resetPagefindForTests(async () => api);
    document.documentElement.setAttribute('lang', 'en');
    let query = '';
    // Stable callback: it is an effect dependency (see the hook's docs).
    const noop = () => {};
    const { rerender } = renderHook(() => usePagefind(query, true, noop));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(inits).toEqual(['en']); // en init is now pending on the gate

    document.documentElement.setAttribute('lang', 'zh');
    query = '中文';
    rerender();
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    expect(maxActive).toBe(1); // zh is queued, not running alongside en

    await act(async () => { releaseFirst(); await new Promise((r) => setTimeout(r, 50)); });
    expect(maxActive).toBe(1);
    expect(inits).toEqual(['en', 'zh']);
    expect(api.destroy).toHaveBeenCalledTimes(1);
    expect(api.search).toHaveBeenCalled();
  });
});
