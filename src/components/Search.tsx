"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback, useId } from 'react';
import { isFeatureEnabled } from '@/lib/features';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import type { ContentType } from '@/lib/search-utils';
import type { TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';
import { resolveLocaleValue } from '@/lib/i18n';
import { usePagefind } from '@/hooks/usePagefind';
import SearchResults from '@/components/SearchResults';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES: ContentType[] = [
  'All',
  ...(isFeatureEnabled('posts') ? ['Post' as ContentType] : []),
  ...(isFeatureEnabled('flow') ? ['Flow' as ContentType] : []),
  ...(isFeatureEnabled('books') ? ['Book' as ContentType] : []),
  ...(isFeatureEnabled('flow') ? ['Note' as ContentType] : []),
];

const CONTENT_TYPE_FEATURE: Record<Exclude<ContentType, 'All'>, keyof typeof siteConfig.features> = {
  Post: 'posts',
  Flow: 'flow',
  Book: 'books',
  Note: 'flow',
};
const RECENT_KEY = 'amytis-recent-searches';
const MAX_RECENT = 5;
const MAX_RESULTS = 8;

const TYPE_LABEL_KEYS: Record<Exclude<ContentType, 'All'>, TranslationKey> = {
  Post: 'search_type_post',
  Flow: 'search_type_flow',
  Book: 'search_type_book',
  Note: 'search_type_note',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function persistRecentSearch(query: string, current: string[]): string[] {
  const updated = [query, ...current.filter((s) => s !== query)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Search() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeType, setActiveType] = useState<ContentType>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  // Tracks whether the modal was actually open, so the close-effect only
  // restores focus after a real close (not on mount).
  const wasOpenRef = useRef(false);
  const baseId = useId();
  const { t, tWith, language } = useLanguage();

  // Reset the keyboard highlight and type tab whenever usePagefind replaces
  // the result set. Stable identity (setState functions never change) so the
  // hook's search effect doesn't re-run on every render.
  const resetResultSelection = useCallback(() => {
    setActiveIndex(-1);
    setActiveType('All');
  }, []);

  const { allResults, isFetching, isUnavailable, isTyping, debouncedQuery } =
    usePagefind(query, isOpen, resetResultSelection);

  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;
  const tabId = (type: ContentType) => `${baseId}-tab-${type}`;

  const getTypeLabel = (type: Exclude<ContentType, 'All'>): string => {
    const featureKey = CONTENT_TYPE_FEATURE[type];
    const featureName = siteConfig.features?.[featureKey]?.name;
    if (featureName) return resolveLocaleValue(featureName, language);
    return t(TYPE_LABEL_KEYS[type]);
  };

  // Load recent searches on mount. localStorage is unavailable during SSR,
  // so this can't be hoisted into useState's initializer without breaking
  // hydration — the mount-only effect is the documented React pattern.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentSearches(loadRecentSearches());
  }, []);

  // Filtered results for the active type tab
  const { displayedResults, totalFilteredCount } = useMemo(() => {
    const filtered = activeType === 'All' ? allResults : allResults.filter((r) => r.type === activeType);
    return { displayedResults: filtered.slice(0, MAX_RESULTS), totalFilteredCount: filtered.length };
  }, [allResults, activeType]);

  // Count per type for tab badges
  const typeCounts = useMemo(() => {
    const counts: Record<ContentType, number> = { All: allResults.length, Post: 0, Flow: 0, Book: 0, Note: 0 };
    for (const r of allResults) counts[r.type]++;
    return counts;
  }, [allResults]);

  // Global Cmd/Ctrl+K + Escape shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus on open; reset local state on close (usePagefind resets its own
  // search state). All the resets are batched into a single React render —
  // the rule's "cascading renders" warning doesn't apply when state changes
  // are batched as siblings, only when one update triggers the next.
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Restore focus to the trigger after a real close so keyboard users
      // aren't dropped at the top of the document.
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        triggerRef.current?.focus();
      }
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery('');
      setActiveIndex(-1);
      setActiveType('All');
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

  function handleNavigate(q: string) {
    if (q.trim()) setRecentSearches((prev) => persistRecentSearch(q.trim(), prev));
    setIsOpen(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Number keys 1–4 switch type tabs when results are visible
    if (allResults.length > 0 && e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
      const visibleTypes = CONTENT_TYPES.filter((ct) => ct === 'All' || typeCounts[ct] > 0);
      const target = visibleTypes[parseInt(e.key, 10) - 1];
      if (target) { e.preventDefault(); setActiveType(target); setActiveIndex(-1); return; }
    }
    if (displayedResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, displayedResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      router.push(displayedResults[activeIndex].url);
      handleNavigate(query);
    }
  }

  function handleModalKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
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

  // Roving focus for the type tablist (ArrowLeft/ArrowRight move the active
  // tab; only the active tab is in the Tab order, per the ARIA tabs pattern).
  function handleTablistKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const visible = CONTENT_TYPES.filter((ct) => ct === 'All' || typeCounts[ct] > 0);
    const current = visible.indexOf(activeType);
    const next =
      e.key === 'ArrowRight'
        ? visible[(current + 1) % visible.length]
        : visible[(current - 1 + visible.length) % visible.length];
    setActiveType(next);
    setActiveIndex(-1);
    tablistRef.current
      ?.querySelector<HTMLButtonElement>(`[data-type="${next}"]`)
      ?.focus();
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }

  const showNoResults = !isTyping && !isFetching && debouncedQuery.length > 0 && displayedResults.length === 0;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="text-foreground/80 hover:text-heading transition-colors duration-200"
        aria-label={t('search_label')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>

      {isOpen && (
        // Overlay: full-column on mobile, centered on desktop
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-start sm:justify-center sm:pt-24 sm:px-4 bg-background/80 backdrop-blur-sm">
          {/* Modal: full-height on mobile, auto-height on desktop */}
          <div
            ref={searchRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('search_label')}
            onKeyDown={handleModalKeyDown}
            className="flex flex-col flex-1 sm:flex-initial min-h-0 w-full sm:max-w-xl bg-background border-b sm:border border-line rounded-none sm:rounded-lg shadow-none sm:shadow-2xl overflow-hidden sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-200"
          >
            {/* Screen-reader live region for result counts */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {debouncedQuery && !isFetching && (
                displayedResults.length > 0
                  ? tWith('search_results_found', { total: totalFilteredCount, query: debouncedQuery })
                  : tWith('search_no_results_for', { query: debouncedQuery })
              )}
            </div>
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
                aria-expanded={displayedResults.length > 0}
                aria-controls={listboxId}
                aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              {/* Spinner — visible while fetching */}
              {isFetching && (
                <svg className="animate-spin shrink-0 ml-2 text-muted" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {/* ESC hint — desktop only, hidden while fetching */}
              {!isFetching && <div className="hidden sm:block text-xs text-muted border border-line px-1.5 py-0.5 rounded ml-2">ESC</div>}
              {/* Close button — mobile only */}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden ml-2 p-1 text-muted hover:text-foreground transition-colors"
                aria-label={t('search_close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Type filter tabs — visible when results exist */}
            {allResults.length > 0 && (
              <div
                ref={tablistRef}
                className="flex items-center gap-1 px-4 pt-2 pb-1 border-b border-line shrink-0"
                role="tablist"
                aria-label={t('search_filter_type')}
                onKeyDown={handleTablistKeyDown}
              >
                {CONTENT_TYPES.filter((type) => type === 'All' || typeCounts[type] > 0).map((type, i) => (
                  <button
                    key={type}
                    id={tabId(type)}
                    data-type={type}
                    role="tab"
                    aria-selected={activeType === type}
                    tabIndex={activeType === type ? 0 : -1}
                    onClick={() => { setActiveType(type); setActiveIndex(-1); }}
                    className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                      activeType === type
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted hover:text-foreground hover:bg-surface-soft'
                    }`}
                  >
                    {type === 'All' ? t('search_all') : getTypeLabel(type)}
                    <span className="ml-1 text-[10px] opacity-60">{typeCounts[type]}</span>
                    <span className="hidden sm:inline ml-1 text-[9px] opacity-30">⌥{i + 1}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Scrollable body: flex-1 on mobile, capped at 60vh on desktop.
                Doubles as the tabpanel for the type tablist when tabs are shown. */}
            <div
              className="flex-1 sm:flex-none overflow-y-auto min-h-0 sm:max-h-[60vh]"
              role={allResults.length > 0 ? 'tabpanel' : undefined}
              aria-labelledby={allResults.length > 0 ? tabId(activeType) : undefined}
            >

              {/* Results listbox + capped-count footer + no-results block */}
              <SearchResults
                displayedResults={displayedResults}
                totalFilteredCount={totalFilteredCount}
                maxResults={MAX_RESULTS}
                activeIndex={activeIndex}
                listboxId={listboxId}
                optionId={optionId}
                showNoResults={showNoResults}
                getTypeLabel={getTypeLabel}
                onResultClick={() => handleNavigate(query)}
                onResultHover={setActiveIndex}
              />

              {/* Pagefind index missing (usually dev without running build:dev) */}
              {isUnavailable && !query && (
                <div className="p-8 text-center text-muted text-sm space-y-1">
                  <p>{t('search_unavailable')}</p>
                  {process.env.NODE_ENV === 'development' && (
                    <p>
                      Run{' '}
                      <code className="text-xs bg-surface-soft px-1 py-0.5 rounded">
                        bun run build:dev
                      </code>{' '}
                      to generate the local index.
                    </p>
                  )}
                </div>
              )}

              {/* Recent searches — shown when input is empty and pagefind is available */}
              {!query && !isUnavailable && recentSearches.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center justify-between px-4 py-1">
                    <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                      {t('recent_searches')}
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[10px] text-muted hover:text-accent transition-colors"
                    >
                      {t('clear')}
                    </button>
                  </div>
                  <ul>
                    {recentSearches.map((s) => (
                      <li key={s}>
                        <button
                          onClick={() => setQuery(s)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-muted hover:text-foreground hover:bg-surface-soft transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M11 8v4l2 2" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Search tips — shown when input is empty and search is available */}
              {!query && !isUnavailable && (
                <div className="px-4 py-3 border-t border-line">
                  <p className="text-[10px] font-medium text-muted/50 uppercase tracking-wider mb-2">{t('search_tips')}</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      ['"exact phrase"', t('search_tip_phrase')],
                      ['word1 word2', t('search_tip_and')],
                      ['-word', t('search_tip_exclude')],
                    ] as [string, string][]).map(([syntax, desc]) => (
                      <div key={syntax} className="flex items-center gap-2 text-[11px]">
                        <code className="font-mono text-accent/70 bg-accent/5 px-1.5 py-0.5 rounded text-[10px] shrink-0">{syntax}</code>
                        <span className="text-muted/50">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
