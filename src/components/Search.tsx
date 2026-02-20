"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
// ─── Types ───────────────────────────────────────────────────────────────────

type ContentType = 'All' | 'Post' | 'Flow' | 'Book';

interface DisplayResult {
  url: string;
  title: string;
  excerpt: string; // contains <mark> tags from Pagefind
  date: string;
  type: ContentType;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_TYPES: ContentType[] = ['All', 'Post', 'Flow', 'Book'];
const RECENT_KEY = 'amytis-recent-searches';
const MAX_RECENT = 5;
const MAX_RESULTS = 8;
const FETCH_RESULTS = 24; // fetch more so type filter always has enough
const DEBOUNCE_MS = 150;

const TYPE_STYLES: Record<string, string> = {
  Flow: 'border-accent/30 text-accent',
  Book: 'border-foreground/30 text-foreground/60',
  Post: 'border-muted/30 text-muted',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResultType(url: string): ContentType {
  if (url.includes('/flows/')) return 'Flow';
  if (url.includes('/books/')) return 'Book';
  return 'Post';
}

/** Extract YYYY-MM-DD from a flow URL like /flows/2026/01/15/ */
function getDateFromUrl(url: string): string {
  const m = url.match(/\/flows\/(\d{4})\/(\d{2})\/(\d{2})\//);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Strip the " | Site Name" suffix that Pagefind picks up from <title> */
function cleanTitle(raw: string): string {
  const i = raw.lastIndexOf(' | ');
  return i >= 0 ? raw.slice(0, i) : raw;
}

function loadRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function persistRecentSearch(query: string, current: string[]): string[] {
  const updated = [query, ...current.filter((s) => s !== query)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

// ─── Pagefind loader ──────────────────────────────────────────────────────────
//
// We use `new Function` to create a runtime-only dynamic import so that
// neither webpack nor Turbopack tries to bundle /pagefind/pagefind.js at
// compile time (the file only exists after `pagefind --site out` runs).

interface PagefindFragment {
  url: string;
  excerpt: string; // contains <mark> tags
  meta: { title?: string; image?: string };
  word_count: number;
}

interface PagefindAPI {
  init: () => Promise<void>;
  search: (q: string) => Promise<{ results: Array<{ data: () => Promise<PagefindFragment> }> }>;
}

let pagefindCache: PagefindAPI | null = null;
let pagefindUnavailable = false;

async function loadPagefind(): Promise<PagefindAPI | null> {
  if (pagefindCache) return pagefindCache;
  if (pagefindUnavailable) return null;
  try {
    // eslint-disable-next-line no-new-func
    const load = new Function('path', 'return import(path)') as (p: string) => Promise<PagefindAPI>;
    const pf = await load('/pagefind/pagefind.js');
    await pf.init();
    pagefindCache = pf;
    return pf;
  } catch {
    pagefindUnavailable = true;
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Search() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allResults, setAllResults] = useState<DisplayResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeType, setActiveType] = useState<ContentType>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // True while debounce is pending — suppress "no results" flash
  const isTyping = query.length > 0 && query !== debouncedQuery;

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // Pre-load Pagefind when the modal first opens
  useEffect(() => {
    if (isOpen) {
      loadPagefind().then((pf) => { if (!pf) setIsUnavailable(true); });
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    if (!query) { setDebouncedQuery(''); return; }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Run Pagefind search on debounced query
  useEffect(() => {
    if (!debouncedQuery) {
      setAllResults([]);
      setActiveIndex(-1);
      setActiveType('All');
      return;
    }

    let cancelled = false;
    setIsFetching(true);

    loadPagefind().then(async (pf) => {
      if (!pf || cancelled) { setIsFetching(false); return; }
      try {
        const search = await pf.search(debouncedQuery);
        const fragments = await Promise.all(
          search.results.slice(0, FETCH_RESULTS).map((r) => r.data())
        );
        if (cancelled) return;
        setAllResults(
          fragments.map((f: PagefindFragment) => ({
            url: f.url,
            title: cleanTitle(f.meta.title ?? ''),
            excerpt: f.excerpt,
            date: getDateFromUrl(f.url),
            type: getResultType(f.url),
          }))
        );
        setActiveIndex(-1);
        setActiveType('All');
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Filtered results for the active type tab
  const displayedResults = useMemo(() => {
    const filtered = activeType === 'All' ? allResults : allResults.filter((r) => r.type === activeType);
    return filtered.slice(0, MAX_RESULTS);
  }, [allResults, activeType]);

  // Count per type for tab badges
  const typeCounts = useMemo(() => {
    const counts: Record<ContentType, number> = { All: allResults.length, Post: 0, Flow: 0, Book: 0 };
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

  // Focus on open; full reset on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setAllResults([]);
      setActiveIndex(-1);
      setActiveType('All');
      setIsFetching(false);
    }
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

  function clearRecentSearches() {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }

  const showNoResults = !isTyping && !isFetching && debouncedQuery && displayedResults.length === 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-foreground/80 hover:text-heading transition-colors duration-200"
        aria-label="Search"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </button>

      {isOpen && (
        // Overlay: full-column on mobile, centered on desktop
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-start sm:justify-center sm:pt-24 sm:px-4 bg-background/80 backdrop-blur-sm">
          {/* Modal: full-height on mobile, auto-height on desktop */}
          <div
            ref={searchRef}
            className="flex flex-col flex-1 sm:flex-initial min-h-0 w-full sm:max-w-xl bg-background border-b sm:border border-muted/20 rounded-none sm:rounded-lg shadow-none sm:shadow-2xl overflow-hidden sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-200"
          >
            {/* Input row */}
            <div className="flex items-center px-4 py-3 border-b border-muted/10 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted mr-3 shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search_placeholder')}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              {/* ESC hint — desktop only */}
              <div className="hidden sm:block text-xs text-muted border border-muted/20 px-1.5 py-0.5 rounded ml-2">ESC</div>
              {/* Close button — mobile only */}
              <button
                onClick={() => setIsOpen(false)}
                className="sm:hidden ml-2 p-1 text-muted hover:text-foreground transition-colors"
                aria-label="Close search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Type filter tabs — visible when results exist */}
            {allResults.length > 0 && (
              <div className="flex items-center gap-1 px-4 pt-2 pb-1 border-b border-muted/10 shrink-0">
                {CONTENT_TYPES.filter((type) => type === 'All' || typeCounts[type] > 0).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setActiveType(type); setActiveIndex(-1); }}
                    className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                      activeType === type
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted hover:text-foreground hover:bg-muted/5'
                    }`}
                  >
                    {type === 'All' ? t('search_all') : type}
                    <span className="ml-1 text-[10px] opacity-60">{typeCounts[type]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Scrollable body: flex-1 on mobile, capped at 60vh on desktop */}
            <div className="flex-1 sm:flex-none overflow-y-auto min-h-0 sm:max-h-[60vh]">

              {/* Results */}
              {displayedResults.length > 0 && (
                <ul className="py-2">
                  {displayedResults.map((result, index) => (
                    <li key={result.url}>
                      <Link
                        href={result.url}
                        onClick={() => handleNavigate(query)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`block px-4 py-3 transition-colors ${index === activeIndex ? 'bg-muted/10' : 'hover:bg-muted/5'}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-sm font-serif font-bold text-heading truncate">
                            {result.title}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {result.date && (
                              <span className="text-[10px] font-mono text-muted/60">{result.date}</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_STYLES[result.type]}`}>
                              {result.type}
                            </span>
                          </div>
                        </div>
                        {/* Pagefind excerpts already include <mark> highlight tags */}
                        <div
                          className="text-xs text-muted mt-1 line-clamp-2 [&_mark]:bg-transparent [&_mark]:text-accent [&_mark]:font-semibold [&_mark]:not-italic"
                          dangerouslySetInnerHTML={{ __html: result.excerpt }}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* No results */}
              {showNoResults && (
                <div className="p-8 text-center text-muted text-sm">{t('no_results')}</div>
              )}

              {/* Pagefind not yet built (dev without running build:dev) */}
              {isUnavailable && !query && (
                <div className="p-8 text-center text-muted text-sm space-y-1">
                  <p>Search index not found.</p>
                  <p>
                    Run{' '}
                    <code className="text-xs bg-muted/10 px-1 py-0.5 rounded">
                      bun run build:dev
                    </code>{' '}
                    to generate it.
                  </p>
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
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-muted hover:text-foreground hover:bg-muted/5 transition-colors"
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
