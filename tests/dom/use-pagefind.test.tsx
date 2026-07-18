import { describe, test, expect, jest, afterEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';
import { usePagefind } from '@/hooks/usePagefind';

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
