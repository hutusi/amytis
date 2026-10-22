"use client";

import React, { Component, lazy, Suspense, useState, useEffect, useRef, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/components/LanguageProvider';
import { OPEN_SEARCH_EVENT } from '@/lib/search-events';
import { searchListboxId } from '@/lib/search-ids';
import type { SearchPanelHandle, SearchPanelStatus } from '@/components/SearchPanel';

// The results panel (the Pagefind client, type tabs, recent searches) loads on
// first use, so readers who never search never download it. Hovering,
// focusing or touching the trigger starts the download early. The dialog
// frame and its input live here, rendered synchronously on open: a tap must
// focus the input inside the gesture for mobile keyboards to open, and the
// same input element stays mounted while the panel arrives.
const loadPanel = () => import('@/components/SearchPanel');
const SearchPanel = lazy(loadPanel);
// Prefetch only: if the download fails, rendering the panel reports it.
const prefetchPanel = () => {
  loadPanel().catch(() => {});
};

const IDLE_STATUS: SearchPanelStatus = { hasOptions: false, isFetching: false };

/**
 * Contains a failed panel download (offline) to the dialog instead of the
 * page. A failed chunk stays failed until the page reloads, so the way to
 * retry is a reload, not remounting.
 */
class PanelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function Search() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchPanelStatus>(IDLE_STATUS);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<SearchPanelHandle>(null);
  // Tracks whether the modal was actually open, so the close-effect only
  // restores focus after a real close (not on mount).
  const wasOpenRef = useRef(false);
  const baseId = useId();
  const { t } = useLanguage();

  // Global shortcuts: Cmd/Ctrl+K toggles; "/" opens (the convention on
  // GitHub, MDN, …) unless the user is typing into a field. Escape is handled
  // by the dialog itself (handleModalKeyDown) so it closes only the search,
  // not an immersive reader underneath that also listens for Escape.
  useEffect(() => {
    // Remember what had focus so closing returns there (a keyboard user who
    // pressed "/" on a link expects to land back on that link).
    const rememberOpener = () => {
      // Only when opening: while the dialog is mounted (Cmd/Ctrl+K closing
      // it, "/" on a tab inside it) the focused element is inside the dialog
      // and is about to unmount, which would lose the real opener.
      if (searchRef.current) return;
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        rememberOpener();
        setIsOpen((prev) => !prev);
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const editing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
        if (!editing) {
          e.preventDefault();
          rememberOpener();
          setIsOpen(true);
        }
      }
    };
    const handleOpenRequest = () => {
      rememberOpener();
      setIsOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, handleOpenRequest);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, handleOpenRequest);
    };
  }, []);

  // Focus on open; reset local state on close (the panel unmounts with the
  // dialog, taking its own state along). All the resets are batched into a
  // single React render — the rule's "cascading renders" warning doesn't
  // apply when state changes are batched as siblings, only when one update
  // triggers the next.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      // Focus right away, not on a timer: until focus is inside the dialog,
      // its own Escape handler can't fire. (The effect of a click/keydown
      // update runs in the same gesture, so mobile keyboards still open.)
      inputRef.current?.focus();
    } else {
      // Restore focus to whatever opened the search (falling back to the
      // trigger) so keyboard users aren't dropped at the top of the document.
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        const opener = openerRef.current;
        openerRef.current = null;
        (opener?.isConnected ? opener : triggerRef.current)?.focus();
      }
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery('');
      setStatus(IDLE_STATUS);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (isOpen) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  // Click outside to close (desktop — modal is full-screen on mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleModalKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      // Stop here so window-level Escape listeners (the immersive reader)
      // don't also close underneath the search.
      e.stopPropagation();
      setIsOpen(false);
      return;
    }
    if (e.key !== 'Tab') return;
    // Result links and inactive tabs carry tabindex="-1" (combobox/tabs
    // patterns: reachable via arrows, not Tab) — exclude them so the trap
    // wraps at the real first/last tabbable.
    const focusable = searchRef.current?.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        onPointerEnter={prefetchPanel}
        onFocus={prefetchPanel}
        onTouchStart={prefetchPanel}
        className="w-8 h-8 flex items-center justify-center text-foreground/80 hover:text-heading transition-colors duration-200"
        aria-label={t('search_label')}
        aria-keyshortcuts="Meta+K Control+K /"
        title={`${t('search_label')} (/)`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>

      {/* Portaled to <body>: the trigger lives in the navbar, which the
          immersive reader hides with display:none, and the dialog must still
          show (over the reader) when a shortcut opens it there. */}
      {isOpen && createPortal(
        // Overlay: full-column on mobile, centered on desktop
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-start sm:justify-center sm:pt-24 sm:px-4 bg-background/80 backdrop-blur-sm print:hidden">
          {/* Modal: full-height on mobile, auto-height on desktop */}
          <div
            ref={searchRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('search_label')}
            onKeyDown={handleModalKeyDown}
            className="flex flex-col flex-1 sm:flex-initial min-h-0 w-full sm:max-w-xl bg-background border-b sm:border border-line rounded-none sm:rounded-lg shadow-none sm:shadow-2xl overflow-hidden animate-fade-in"
          >
            {/* Input row */}
            <div className="flex items-center px-4 py-3 border-b border-line shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted mr-3 shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search_placeholder')}
                aria-label={t('search_label')}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={status.hasOptions}
                aria-controls={searchListboxId(baseId)}
                aria-activedescendant={status.activeDescendant}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => panelRef.current?.handleInputKeyDown(e)}
              />
              {/* Spinner — visible while fetching */}
              {status.isFetching && (
                <svg className="animate-spin shrink-0 ml-2 text-muted" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {/* ESC hint — desktop only, hidden while fetching */}
              {!status.isFetching && <div className="hidden sm:block text-xs text-muted border border-line px-1.5 py-0.5 rounded ml-2">ESC</div>}
              {/* Close button — mobile only */}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden ml-2 p-1 text-muted hover:text-foreground transition-colors"
                aria-label={t('search_close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <PanelBoundary
              fallback={
                <div className="p-8 text-center text-muted text-sm space-y-3">
                  <p>{t('search_load_failed')}</p>
                  <button type="button" onClick={() => window.location.reload()} className="text-accent hover:underline">
                    {t('search_reload')}
                  </button>
                </div>
              }
            >
              <Suspense fallback={null}>
                <SearchPanel
                  ref={panelRef}
                  query={query}
                  baseId={baseId}
                  onQueryChange={setQuery}
                  onStatusChange={setStatus}
                  onNavigate={() => setIsOpen(false)}
                />
              </Suspense>
            </PanelBoundary>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
