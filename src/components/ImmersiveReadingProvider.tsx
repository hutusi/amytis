'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
}

const ImmersiveReadingContext = createContext<ImmersiveReadingContextValue | undefined>(undefined);

export function ImmersiveReadingProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [fontSize, setFontSize] = useState<ReadingFontSize>('m');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('auto');
  const [columnWidth, setColumnWidth] = useState<ReadingColumnWidth>('wide');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // Auto-collapse the sidebar on narrow viewports when entering immersive mode.
  // Without this, the sidebar overlaps the article on tablets / phones.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = (matches: boolean) => setSidebarOpen(!matches);
    sync(mq.matches);
    const onChange = (e: MediaQueryListEvent) => sync(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [enabled]);

  // Auto-enter immersive mode when the URL carries `?immersive=1` (used by the
  // "Immersive reading" CTA on the book index page). Strips the flag from the
  // URL after triggering so back-navigation doesn't loop the reader open.
  // The ref guard prevents re-entry if the user manually exits while the param
  // is still in the URL — replaceState below clears it, but the ref also
  // defends against React effect re-runs.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const autoEnteredRef = useRef(false);
  useEffect(() => {
    if (autoEnteredRef.current) return;
    if (searchParams?.get('immersive') !== '1') return;
    autoEnteredRef.current = true;
    const activate = () => setEnabled(true);
    activate();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('immersive');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

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
