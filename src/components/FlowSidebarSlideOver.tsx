'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';

interface FlowSidebarSlideOverProps {
  entryDates: string[];
  currentDate?: string;
  tags?: Record<string, number>;
  selectedTag?: string | null;
  onTagSelect?: (tag: string) => void;
}

export default function FlowSidebarSlideOver(props: FlowSidebarSlideOverProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-20 inline-flex items-center gap-2 px-3 py-2 text-xs text-muted bg-background border border-muted/20 rounded-full shadow-sm hover:border-accent hover:text-accent transition-colors"
        aria-label={t('browse')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
        </svg>
        <span>{t('browse')}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
          <button
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
            aria-label={t('close')}
            tabIndex={-1}
          />
          <div className="relative ml-auto h-full w-full max-w-[320px] bg-background border-l border-muted/20 overflow-y-auto p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1 text-muted hover:text-accent transition-colors"
              aria-label={t('close')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <FlowCalendarSidebar {...props} variant="panel" />
          </div>
        </div>
      )}
    </>
  );
}
