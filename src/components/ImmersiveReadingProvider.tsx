'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ReadingFontSize = 's' | 'm' | 'l' | 'xl';
export type ReadingTheme = 'auto' | 'light' | 'sepia' | 'dark';

interface ImmersiveReadingContextValue {
  enabled: boolean;
  fontSize: ReadingFontSize;
  readingTheme: ReadingTheme;
  sidebarOpen: boolean;
  toggle: () => void;
  enter: () => void;
  exit: () => void;
  setFontSize: (size: ReadingFontSize) => void;
  setReadingTheme: (theme: ReadingTheme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const ImmersiveReadingContext = createContext<ImmersiveReadingContextValue | undefined>(undefined);

export function ImmersiveReadingProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [fontSize, setFontSize] = useState<ReadingFontSize>('m');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('auto');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const enter = useCallback(() => setEnabled(true), []);
  const exit = useCallback(() => setEnabled(false), []);
  const toggle = useCallback(() => setEnabled(prev => !prev), []);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);

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
      setEnabled(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);

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

  return (
    <ImmersiveReadingContext.Provider
      value={{
        enabled,
        fontSize,
        readingTheme,
        sidebarOpen,
        toggle,
        enter,
        exit,
        setFontSize,
        setReadingTheme,
        toggleSidebar,
        setSidebarOpen,
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
