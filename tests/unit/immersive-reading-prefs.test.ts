import { describe, test, expect } from 'bun:test';
import {
  DEFAULT_PREFS,
  STORAGE_KEY,
  readStoredPrefs,
  writeStoredPrefs,
  type StoredPrefs,
} from '../../src/lib/immersive-reading-prefs';

// Minimal in-memory mock matching the Storage interface subsets the helpers
// accept. Per-test instance keeps state isolated and avoids touching
// globalThis.localStorage. Optional setItem override lets us simulate
// private-browsing / quota-exceeded throws.
function makeMockStorage(
  initial?: Record<string, string>,
  opts: { setItemThrows?: boolean } = {},
) {
  const store: Record<string, string> = { ...(initial ?? {}) };
  return {
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      if (opts.setItemThrows) throw new Error('quota exceeded');
      store[key] = value;
    },
    _store: store,
  };
}

describe('readStoredPrefs', () => {
  test('returns defaults when storage is empty', () => {
    expect(readStoredPrefs(makeMockStorage())).toEqual(DEFAULT_PREFS);
  });

  test('returns defaults when no storage is available', () => {
    // Passing a storage whose getItem always returns null mirrors the
    // "globalThis.localStorage missing" path. Production callers can also
    // pass undefined and rely on the lazy default — that path is exercised
    // by the provider in the browser, not by unit tests.
    const empty = { getItem: () => null };
    expect(readStoredPrefs(empty)).toEqual(DEFAULT_PREFS);
  });

  test('returns defaults when stored JSON is invalid', () => {
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: 'not-json{' }))).toEqual(DEFAULT_PREFS);
  });

  test('returns defaults when stored value is not an object', () => {
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: '"a string"' }))).toEqual(DEFAULT_PREFS);
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: 'null' }))).toEqual(DEFAULT_PREFS);
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: '42' }))).toEqual(DEFAULT_PREFS);
  });

  test('returns defaults when storage entry is missing for the key', () => {
    expect(readStoredPrefs(makeMockStorage({ 'unrelated-key': 'whatever' }))).toEqual(DEFAULT_PREFS);
  });

  test('round-trips a fully valid prefs blob', () => {
    const blob: StoredPrefs = {
      fontSize: 'xl',
      readingTheme: 'sepia',
      columnWidth: 'narrow',
      sidebarOpen: false,
    };
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: JSON.stringify(blob) }))).toEqual(blob);
  });

  // The schema-drift case the helpers exist for: one corrupt key must not
  // discard the whole blob — other valid keys still apply, the bad one
  // falls back to its default.
  test('per-key fallback: bad fontSize, others survive', () => {
    const stored = JSON.stringify({
      fontSize: 'banana',
      readingTheme: 'dark',
      columnWidth: 'full',
      sidebarOpen: false,
    });
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: stored }))).toEqual({
      fontSize: DEFAULT_PREFS.fontSize, // fell back
      readingTheme: 'dark',
      columnWidth: 'full',
      sidebarOpen: false,
    });
  });

  test('per-key fallback: bad readingTheme + columnWidth, others survive', () => {
    const stored = JSON.stringify({
      fontSize: 's',
      readingTheme: 'neon',
      columnWidth: 'ultra-wide',
      sidebarOpen: true,
    });
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: stored }))).toEqual({
      fontSize: 's',
      readingTheme: DEFAULT_PREFS.readingTheme,
      columnWidth: DEFAULT_PREFS.columnWidth,
      sidebarOpen: true,
    });
  });

  test('sidebarOpen is strict-boolean — string "true" does not count', () => {
    const stored = JSON.stringify({
      fontSize: 'm',
      readingTheme: 'auto',
      columnWidth: 'wide',
      sidebarOpen: 'true',
    });
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: stored })).sidebarOpen).toBe(
      DEFAULT_PREFS.sidebarOpen,
    );
  });

  test('returns defaults when all keys are missing from a valid object', () => {
    expect(readStoredPrefs(makeMockStorage({ [STORAGE_KEY]: '{}' }))).toEqual(DEFAULT_PREFS);
  });
});

describe('writeStoredPrefs', () => {
  test('writes the full blob under STORAGE_KEY as JSON', () => {
    const storage = makeMockStorage();
    const blob: StoredPrefs = {
      fontSize: 'l',
      readingTheme: 'dark',
      columnWidth: 'medium',
      sidebarOpen: false,
    };
    writeStoredPrefs(blob, storage);
    expect(JSON.parse(storage._store[STORAGE_KEY])).toEqual(blob);
  });

  test('swallows throws (private browsing / quota exceeded)', () => {
    const storage = makeMockStorage(undefined, { setItemThrows: true });
    // Must not crash — the production caller relies on this silence so the
    // reader still works in private browsing.
    expect(() => writeStoredPrefs(DEFAULT_PREFS, storage)).not.toThrow();
  });

  test('does nothing when no storage is available', () => {
    // Same as above but exercising the no-storage path. The "no storage"
    // call site in production happens during SSR.
    expect(() => writeStoredPrefs(DEFAULT_PREFS, undefined)).not.toThrow();
  });
});
