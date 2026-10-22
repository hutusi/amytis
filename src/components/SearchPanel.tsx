"use client";

import React, { useState, useEffect, useCallback, useImperativeHandle, useRef, type Ref } from 'react';
import { isFeatureEnabled } from '@/lib/features';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/LanguageProvider';
import { type ContentType, parseRecentSearches, resolveTypeHotkey } from '@/lib/search-utils';
import type { TranslationKey } from '@/i18n/translations';
import { siteConfig } from '../../site.config';
import { resolveLocaleValue } from '@/lib/i18n';
import { RESULTS_PER_TAB, usePagefind } from '@/hooks/usePagefind';
import SearchResults from '@/components/SearchResults';
import { searchListboxId, searchOptionId } from '@/lib/search-ids';

// The body of the search dialog: Pagefind results, type tabs, recent searches
// and tips. Search.tsx loads it on first open, so readers who never search
// never download it; the dialog frame and its input stay in Search.tsx.

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

const TYPE_LABEL_KEYS: Record<Exclude<ContentType, 'All'>, TranslationKey> = {
  Post: 'search_type_post',
  Flow: 'search_type_flow',
  Book: 'search_type_book',
  Note: 'search_type_note',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadRecentSearches(): string[] {
  try {
    return parseRecentSearches(localStorage.getItem(RECENT_KEY), MAX_RECENT);
  } catch {
    return []; // localStorage.getItem itself threw (storage disabled)
  }
}

function persistRecentSearch(query: string, current: string[]): string[] {
  const updated = [query, ...current.filter((s) => s !== query)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** What the input in Search.tsx delegates to the panel. */
export interface SearchPanelHandle {
  handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void;
}

/** What the input in Search.tsx reflects: its combobox ARIA and the spinner. */
export interface SearchPanelStatus {
  hasOptions: boolean;
  activeDescendant?: string;
  isFetching: boolean;
}

interface SearchPanelProps {
  ref: Ref<SearchPanelHandle>;
  query: string;
  /** useId() of the dialog, so the input's aria-controls matches the listbox. */
  baseId: string;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: SearchPanelStatus) => void;
  /** A result was opened: the dialog closes. */
  onNavigate: () => void;
}

export default function SearchPanel({ ref, query, baseId, onQueryChange, onStatusChange, onNavigate }: SearchPanelProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(-1);
  // Read in the initializer: the panel only ever mounts on the client, after
  // the dialog opened, so there is no server render to mismatch.
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const tablistRef = useRef<HTMLDivElement>(null);
  const { t, tWith, language } = useLanguage();

  // Reset the keyboard highlight whenever usePagefind replaces the result
  // set. Stable identity (setState functions never change) so the hook's
  // search effect doesn't re-run on every render.
  const resetResultSelection = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  const {
    results: displayedResults,
    typeCounts,
    activeType,
    setActiveType,
    isFetching,
    isUnavailable,
    isError,
    isTyping,
    debouncedQuery,
  } = usePagefind(query, true, resetResultSelection);
  const totalFilteredCount = typeCounts[activeType];
  const hasResults = typeCounts.All > 0;

  const listboxId = searchListboxId(baseId);
  const optionId = (index: number) => searchOptionId(baseId, index);
  const tabId = (type: ContentType) => `${baseId}-tab-${type}`;

  const getTypeLabel = (type: Exclude<ContentType, 'All'>): string => {
    const featureKey = CONTENT_TYPE_FEATURE[type];
    const featureName = siteConfig.features?.[featureKey]?.name;
    if (featureName) return resolveLocaleValue(featureName, language);
    return t(TYPE_LABEL_KEYS[type]);
  };

  const hasOptions = displayedResults.length > 0;
  const activeDescendant = activeIndex >= 0 ? optionId(activeIndex) : undefined;
  useEffect(() => {
    onStatusChange({ hasOptions, activeDescendant, isFetching });
  }, [hasOptions, activeDescendant, isFetching, onStatusChange]);

  function handleNavigate(q: string) {
    if (q.trim()) setRecentSearches((prev) => persistRecentSearch(q.trim(), prev));
    onNavigate();
  }

  useImperativeHandle(ref, () => ({
    handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      // An IME (Chinese, Japanese, Korean input) uses Enter and the arrows to
      // pick and commit candidates; never treat those as result navigation.
      // keyCode 229 covers Safari, which reports the committing Enter with
      // isComposing already false.
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      // Alt+digit switches type tabs when results are visible.
      if (hasResults && e.altKey) {
        const visibleTypes = CONTENT_TYPES.filter((ct) => ct === 'All' || typeCounts[ct] > 0);
        const target = resolveTypeHotkey(e.key, visibleTypes);
        if (target) { e.preventDefault(); setActiveType(target); setActiveIndex(-1); return; }
      }
      if (displayedResults.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, displayedResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter') {
        // Enter without an arrowed selection opens the top hit.
        e.preventDefault();
        router.push(displayedResults[Math.max(activeIndex, 0)].url);
        handleNavigate(query);
      }
    },
  }));

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

  const showNoResults = !isTyping && !isFetching && !isError && debouncedQuery.length > 0 && displayedResults.length === 0;

  return (
    <>
      {/* Screen-reader live region for result counts */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {debouncedQuery && !isFetching && (
          displayedResults.length > 0
            ? tWith('search_results_found', { total: totalFilteredCount, query: debouncedQuery })
            : tWith('search_no_results_for', { query: debouncedQuery })
        )}
      </div>

      {/* Type filter tabs — visible when results exist */}
      {hasResults && (
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
        role={hasResults ? 'tabpanel' : undefined}
        aria-labelledby={hasResults ? tabId(activeType) : undefined}
      >

        {/* Results listbox + capped-count footer + no-results block */}
        <SearchResults
          displayedResults={displayedResults}
          totalFilteredCount={totalFilteredCount}
          maxResults={RESULTS_PER_TAB}
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

        {/* A search rejected at runtime (recoverable — retry by editing the query) */}
        {isError && !isFetching && query && (
          <div className="p-8 text-center text-muted text-sm">
            <p>{t('search_error')}</p>
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
                    onClick={() => onQueryChange(s)}
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
            <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-2">{t('search_tips')}</p>
            <div className="flex flex-col gap-1.5">
              {([
                ['"exact phrase"', t('search_tip_phrase')],
                ['word1 word2', t('search_tip_and')],
                ['-word', t('search_tip_exclude')],
              ] as [string, string][]).map(([syntax, desc]) => (
                <div key={syntax} className="flex items-center gap-2 text-[11px]">
                  <code className="font-mono text-accent/70 bg-accent/5 px-1.5 py-0.5 rounded text-[10px] shrink-0">{syntax}</code>
                  <span className="text-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
