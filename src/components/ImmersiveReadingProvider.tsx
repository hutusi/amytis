'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type ReadingFontSize = 's' | 'm' | 'l' | 'xl';
export type ReadingTheme = 'auto' | 'light' | 'sepia' | 'dark';
export type ReadingColumnWidth = 'narrow' | 'medium' | 'wide' | 'full';

const FONT_SIZE_VALUES: readonly ReadingFontSize[] = ['s', 'm', 'l', 'xl'];
const THEME_VALUES: readonly ReadingTheme[] = ['auto', 'light', 'sepia', 'dark'];
const COLUMN_WIDTH_VALUES: readonly ReadingColumnWidth[] = ['narrow', 'medium', 'wide', 'full'];

const DEFAULT_PREFS = {
  fontSize: 'm' as ReadingFontSize,
  readingTheme: 'auto' as ReadingTheme,
  columnWidth: 'wide' as ReadingColumnWidth,
  sidebarOpen: true,
};

const STORAGE_KEY = 'amytis-reader-prefs';

interface StoredPrefs {
  fontSize: ReadingFontSize;
  readingTheme: ReadingTheme;
  columnWidth: ReadingColumnWidth;
  sidebarOpen: boolean;
}

// Read + validate prefs from localStorage. Per-key defensive: if any key is
// stale / unknown / wrong-typed (schema drift, manual edits), fall back to its
// default rather than discarding the whole blob.
function readStoredPrefs(): StoredPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
      sidebarOpen: typeof obj.sidebarOpen === 'boolean' ? obj.sidebarOpen : DEFAULT_PREFS.sidebarOpen,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeStoredPrefs(prefs: StoredPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private browsing / quota exceeded — ignore */
  }
}

interface ImmersiveReadingContextValue {
  enabled: boolean;
  fontSize: ReadingFontSize;
  readingTheme: ReadingTheme;
  columnWidth: ReadingColumnWidth;
  sidebarOpen: boolean;
  prefsPanelOpen: boolean;
  toggle: () => void;
  enter: () => void;
  exit: () => void;
  setFontSize: (size: ReadingFontSize) => void;
  setReadingTheme: (theme: ReadingTheme) => void;
  setColumnWidth: (width: ReadingColumnWidth) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  togglePrefsPanel: () => void;
  closePrefsPanel: () => void;
  resetPrefs: () => void;
}

const ImmersiveReadingContext = createContext<ImmersiveReadingContextValue | undefined>(undefined);

export function ImmersiveReadingProvider({ children }: { children: ReactNode }) {
  // Initial state intentionally matches DEFAULT_PREFS so SSR/CSR render
  // identically — localStorage is read in an effect after mount.
  const [enabled, setEnabled] = useState(false);
  const [fontSize, setFontSize] = useState<ReadingFontSize>(DEFAULT_PREFS.fontSize);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>(DEFAULT_PREFS.readingTheme);
  const [columnWidth, setColumnWidth] = useState<ReadingColumnWidth>(DEFAULT_PREFS.columnWidth);
  const [sidebarOpen, setSidebarOpen] = useState(DEFAULT_PREFS.sidebarOpen);
  const [prefsPanelOpen, setPrefsPanelOpen] = useState(false);

  const enter = useCallback(() => setEnabled(true), []);
  const exit = useCallback(() => {
    setEnabled(false);
    setPrefsPanelOpen(false);
  }, []);
  const toggle = useCallback(() => {
    setEnabled(prev => {
      if (prev) setPrefsPanelOpen(false);
      return !prev;
    });
  }, []);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const togglePrefsPanel = useCallback(() => setPrefsPanelOpen(prev => !prev), []);
  const closePrefsPanel = useCallback(() => setPrefsPanelOpen(false), []);
  const resetPrefs = useCallback(() => {
    setFontSize(DEFAULT_PREFS.fontSize);
    setReadingTheme(DEFAULT_PREFS.readingTheme);
    setColumnWidth(DEFAULT_PREFS.columnWidth);
    setSidebarOpen(DEFAULT_PREFS.sidebarOpen);
  }, []);

  // Hydrate prefs from localStorage on mount, then persist on every change.
  // `hydratedRef` gates the persist effect so the first run (the initial
  // post-mount commit, before the read-effect has applied) doesn't clobber
  // a real stored value with the React defaults.
  const hydratedRef = useRef(false);
  useEffect(() => {
    const stored = readStoredPrefs();
    const applyStored = () => {
      setFontSize(stored.fontSize);
      setReadingTheme(stored.readingTheme);
      setColumnWidth(stored.columnWidth);
      setSidebarOpen(stored.sidebarOpen);
      hydratedRef.current = true;
    };
    applyStored();
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    writeStoredPrefs({ fontSize, readingTheme, columnWidth, sidebarOpen });
  }, [fontSize, readingTheme, columnWidth, sidebarOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (enabled) {
      root.dataset.immersive = 'true';
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        delete root.dataset.immersive;
        document.body.style.overflow = previousOverflow;
      };
    }
    delete root.dataset.immersive;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (prefsPanelOpen) {
        setPrefsPanelOpen(false);
      } else {
        setEnabled(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, prefsPanelOpen]);

  // Auto-collapse the sidebar on narrow viewports when entering immersive mode
  // (or when resizing into the narrow range). Without this, the sidebar
  // overlaps the article on tablets / phones. Deliberately one-directional:
  // we never auto-open on a wide-resize, so a user who manually closed the
  // sidebar on desktop keeps that preference instead of having it overridden.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const collapseIfNarrow = (matches: boolean) => {
      if (matches) setSidebarOpen(false);
    };
    collapseIfNarrow(mq.matches);
    const onChange = (e: MediaQueryListEvent) => collapseIfNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [enabled]);

  return (
    <ImmersiveReadingContext.Provider
      value={{
        enabled,
        fontSize,
        readingTheme,
        columnWidth,
        sidebarOpen,
        prefsPanelOpen,
        toggle,
        enter,
        exit,
        setFontSize,
        setReadingTheme,
        setColumnWidth,
        toggleSidebar,
        setSidebarOpen,
        togglePrefsPanel,
        closePrefsPanel,
        resetPrefs,
      }}
    >
      {children}
    </ImmersiveReadingContext.Provider>
  );
}

export function useImmersiveReading(): ImmersiveReadingContextValue {
  const ctx = useContext(ImmersiveReadingContext);
  if (!ctx) {
    throw new Error('useImmersiveReading must be used within an ImmersiveReadingProvider');
  }
  return ctx;
}
