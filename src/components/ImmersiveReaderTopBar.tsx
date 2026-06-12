'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';
import { useLanguage } from '@/components/LanguageProvider';
import ImmersiveReadingPrefsPopover from '@/components/ImmersiveReadingPrefsPopover';

interface ImmersiveReaderTopBarProps {
  /** Breadcrumb root link — caller computes the URL (book URL or series URL). */
  rootHref: string;
  /** Left side of the breadcrumb. */
  rootTitle: string;
  /** Right side of the breadcrumb. */
  currentTitle: string;
}

export default function ImmersiveReaderTopBar({
  rootHref,
  rootTitle,
  currentTitle,
}: ImmersiveReaderTopBarProps) {
  const { t } = useLanguage();
  const { sidebarOpen, prefsPanelOpen, toggleSidebar, togglePrefsPanel, exit } = useImmersiveReading();

  const prefsButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <header
      // `relative z-30` is load-bearing: `backdrop-blur-md` creates a stacking
      // context on the header, which would otherwise paint at "block-in-flow"
      // (step 3) of the overlay's stacking context — BELOW positioned
      // descendants of <main>, e.g. code blocks (cb-root is `position: relative`).
      // Promoting the header to a positioned descendant with z-index pushes it
      // above those, so the Aa popover (which renders inside the header and
      // visually overflows down into the article area) stays on top and
      // clickable when it overlaps a code block.
      className="relative z-30 h-12 flex items-center gap-3 px-3 border-b border-ink/[0.06] bg-background/95 backdrop-blur-md shrink-0 select-none"
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-pressed={sidebarOpen}
        aria-label={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
        title={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/80 hover:text-accent hover:bg-ink/[0.05] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="min-w-0 flex-1 flex items-center gap-2 text-sm">
        <Link
          href={rootHref}
          className="font-serif font-semibold text-heading hover:text-accent truncate no-underline"
          title={rootTitle}
        >
          {rootTitle}
        </Link>
        <span className="text-muted/50 hidden sm:inline" aria-hidden="true">/</span>
        <span className="text-muted truncate hidden sm:inline" title={currentTitle}>
          {currentTitle}
        </span>
      </div>

      <div className="relative shrink-0">
        <button
          ref={prefsButtonRef}
          type="button"
          onClick={togglePrefsPanel}
          aria-expanded={prefsPanelOpen}
          aria-haspopup="dialog"
          aria-label={t('reading_preferences')}
          title={t('reading_preferences')}
          className={`h-8 w-9 inline-flex items-center justify-center rounded-md transition-colors ${
            prefsPanelOpen
              ? 'bg-ink/[0.05] text-accent'
              : 'text-foreground/80 hover:text-accent hover:bg-ink/[0.05]'
          }`}
        >
          <span aria-hidden="true" className="font-serif leading-none">
            <span className="text-[15px] font-bold">A</span>
            <span className="text-[10px]">a</span>
          </span>
        </button>
        <ImmersiveReadingPrefsPopover toggleButtonRef={prefsButtonRef} />
      </div>

      <button
        type="button"
        onClick={exit}
        aria-label={t('exit_reading_mode')}
        title={t('exit_reading_mode')}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/80 hover:text-accent hover:bg-ink/[0.05] transition-colors shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>
  );
}
