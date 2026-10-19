import { describe, test, expect, jest, afterEach, mock } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { __resetPagefindForTests, toDisplayResult, usePagefind } from '@/hooks/usePagefind';

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
});
