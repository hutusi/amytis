// Storage layer for the immersive reader's persisted preferences. Lives here
// (not inside ImmersiveReadingProvider) so the defensive-parsing and write-
// silencing logic is unit-testable without rendering React or mocking
// `window.localStorage` globally — tests pass an in-memory storage object via
// the optional `storage` parameter.
//
// Public contract: STORAGE_KEY is the user-visible localStorage key. Renaming
// it invalidates every existing reader's prefs — don't.

import type {
  ReadingColumnWidth,
  ReadingFontSize,
  ReadingTheme,
} from '@/components/ImmersiveReadingProvider';

export const STORAGE_KEY = 'amytis-reader-prefs';

const FONT_SIZE_VALUES: readonly ReadingFontSize[] = ['s', 'm', 'l', 'xl'];
const THEME_VALUES: readonly ReadingTheme[] = ['auto', 'light', 'sepia', 'dark'];
const COLUMN_WIDTH_VALUES: readonly ReadingColumnWidth[] = ['narrow', 'medium', 'wide', 'full'];

export interface StoredPrefs {
  fontSize: ReadingFontSize;
  readingTheme: ReadingTheme;
  columnWidth: ReadingColumnWidth;
  sidebarOpen: boolean;
}

export const DEFAULT_PREFS: StoredPrefs = {
  fontSize: 'm',
  readingTheme: 'auto',
  columnWidth: 'wide',
  sidebarOpen: true,
};

/** Resolve the default storage lazily — `globalThis.localStorage` is undefined
 * during SSR and accessing it at module top-level would crash imports. The
 * try/catch is also load-bearing: in some privacy-restricted browser modes
 * (Safari "block all cookies", Firefox with site data disabled) the
 * `localStorage` getter itself throws a SecurityError instead of returning
 * the object — without the catch, that would escape into readStoredPrefs /
 * writeStoredPrefs and crash the reader. */
function defaultReadStorage(): Pick<Storage, 'getItem'> | null {
  if (typeof globalThis === 'undefined') return null;
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

function defaultWriteStorage(): Pick<Storage, 'setItem'> | null {
  if (typeof globalThis === 'undefined') return null;
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

/** Read + validate prefs from storage. Per-key defensive: if any key is
 * stale / unknown / wrong-typed (schema drift, manual edits), fall back to
 * its default rather than discarding the whole blob. */
export function readStoredPrefs(storage?: Pick<Storage, 'getItem'>): StoredPrefs {
  const ls = storage ?? defaultReadStorage();
  if (!ls) return DEFAULT_PREFS;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFS;
    const obj = parsed as Record<string, unknown>;
    return {
      fontSize: (FONT_SIZE_VALUES as readonly string[]).includes(obj.fontSize as string)
        ? (obj.fontSize as ReadingFontSize)
        : DEFAULT_PREFS.fontSize,
      readingTheme: (THEME_VALUES as readonly string[]).includes(obj.readingTheme as string)
        ? (obj.readingTheme as ReadingTheme)
        : DEFAULT_PREFS.readingTheme,
      columnWidth: (COLUMN_WIDTH_VALUES as readonly string[]).includes(obj.columnWidth as string)
        ? (obj.columnWidth as ReadingColumnWidth)
        : DEFAULT_PREFS.columnWidth,
      sidebarOpen:
        typeof obj.sidebarOpen === 'boolean' ? obj.sidebarOpen : DEFAULT_PREFS.sidebarOpen,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeStoredPrefs(
  prefs: StoredPrefs,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const ls = storage ?? defaultWriteStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private browsing / quota exceeded — ignore */
  }
}
