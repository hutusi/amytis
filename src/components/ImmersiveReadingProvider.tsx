'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFS, readStoredPrefs, writeStoredPrefs } from '@/lib/immersive-reading-prefs';

export type ReadingFontSize = 's' | 'm' | 'l' | 'xl';
export type ReadingTheme = 'auto' | 'light' | 'sepia' | 'dark';
export type ReadingColumnWidth = 'narrow' | 'medium' | 'wide' | 'full';

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
  // The persist effect itself flips `hydratedRef` on its first run and
  // no-ops — without this, the initial commit's persist run would race
  // ahead of the hydration setters (state hasn't re-rendered yet, so it'd
  // read the React defaults from the closure and clobber the stored blob
  // with them before the next render restores the correct values).
  const hydratedRef = useRef(false);
  useEffect(() => {
    const stored = readStoredPrefs();
    const applyStored = () => {
      setFontSize(stored.fontSize);
      setReadingTheme(stored.readingTheme);
      setColumnWidth(stored.columnWidth);
      setSidebarOpen(stored.sidebarOpen);
    };
    applyStored();
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
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
