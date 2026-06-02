'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ReadingFontSize = 's' | 'm' | 'l' | 'xl';
export type ReadingTheme = 'auto' | 'light' | 'sepia' | 'dark';
export type ReadingColumnWidth = 'narrow' | 'medium' | 'wide';

interface ImmersiveReadingContextValue {
  enabled: boolean;
  fontSize: ReadingFontSize;
  readingTheme: ReadingTheme;
  columnWidth: ReadingColumnWidth;
  panelOpen: boolean;
  toggle: () => void;
  enter: () => void;
  exit: () => void;
  setFontSize: (size: ReadingFontSize) => void;
  setReadingTheme: (theme: ReadingTheme) => void;
  setColumnWidth: (width: ReadingColumnWidth) => void;
  togglePanel: () => void;
  closePanel: () => void;
}

const ImmersiveReadingContext = createContext<ImmersiveReadingContextValue | undefined>(undefined);

export function ImmersiveReadingProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [fontSize, setFontSize] = useState<ReadingFontSize>('m');
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('auto');
  const [columnWidth, setColumnWidth] = useState<ReadingColumnWidth>('medium');
  const [panelOpen, setPanelOpen] = useState(false);

  const enter = useCallback(() => setEnabled(true), []);
  const exit = useCallback(() => {
    setEnabled(false);
    setPanelOpen(false);
  }, []);
  const toggle = useCallback(() => {
    setEnabled(prev => {
      if (prev) setPanelOpen(false);
      return !prev;
    });
  }, []);
  const togglePanel = useCallback(() => setPanelOpen(prev => !prev), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (enabled) {
      root.dataset.immersive = 'true';
    } else {
      delete root.dataset.immersive;
    }
    return () => {
      delete root.dataset.immersive;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (panelOpen) {
        event.preventDefault();
        setPanelOpen(false);
      } else {
        event.preventDefault();
        setEnabled(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, panelOpen]);

  return (
    <ImmersiveReadingContext.Provider
      value={{
        enabled,
        fontSize,
        readingTheme,
        columnWidth,
        panelOpen,
        toggle,
        enter,
        exit,
        setFontSize,
        setReadingTheme,
        setColumnWidth,
        togglePanel,
        closePanel,
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
