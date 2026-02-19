"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { useLanguage } from '@/components/LanguageProvider';

interface SearchResult {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  category: string;
  tags: string[];
  content?: string;
}

type FuseMatch = {
  key?: string;
  indices: ReadonlyArray<[number, number]>;
  value?: string;
};

type FuseResult = {
  item: SearchResult;
  matches?: FuseMatch[];
};

type ContentType = 'All' | 'Post' | 'Flow' | 'Book';

const CONTENT_TYPES: ContentType[] = ['All', 'Post', 'Flow', 'Book'];
const RECENT_KEY = 'amytis-recent-searches';
const MAX_RECENT = 5;
const MAX_RESULTS = 8;
const DEBOUNCE_MS = 150;

function getResultHref(slug: string): string {
  if (slug.startsWith('books/') || slug.startsWith('flows/')) return `/${slug}`;
  return `/posts/${slug}`;
}

function getResultType(slug: string): ContentType {
  if (slug.startsWith('flows/')) return 'Flow';
  if (slug.startsWith('books/')) return 'Book';
  return 'Post';
}

function highlightText(text: string, indices: ReadonlyArray<[number, number]> | undefined): React.ReactNode {
  if (!indices || indices.length === 0) return text;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const [start, end] of indices) {
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <mark key={start} className="bg-transparent text-accent font-semibold not-italic">
        {text.slice(start, end + 1)}
      </mark>
    );
    lastIndex = end + 1;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

const TYPE_STYLES: Record<string, string> = {
  Flow: 'border-accent/30 text-accent',
  Book: 'border-foreground/30 text-foreground/60',
  Post: 'border-muted/30 text-muted',
};

function loadRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistRecentSearch(query: string, current: string[]): string[] {
  const updated = [query, ...current.filter((s) => s !== query)].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

export default function Search() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allResults, setAllResults] = useState<FuseResult[]>([]);
  const [posts, setPosts] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeType, setActiveType] = useState<ContentType>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // True while the user has typed but the debounce hasn't fired yet
  const isSearching = query.length > 0 && query !== debouncedQuery;

  // Load recent searches once on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  // Load search index (lazy, once)
  useEffect(() => {
    if (isOpen && posts.length === 0) {
      fetch('/search.json')
        .then((res) => res.json())
        .then((data) => setPosts(data))
        .catch((err) => console.error('Failed to load search index', err));
    }
  }, [isOpen, posts.length]);

  // Debounce the raw query by DEBOUNCE_MS
  useEffect(() => {
    if (!query) { setDebouncedQuery(''); return; }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search against the debounced query
  useEffect(() => {
    if (!debouncedQuery) {
      setAllResults([]);
      setActiveIndex(-1);
      setActiveType('All');
      return;
    }

    const fuse = new Fuse(posts, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'excerpt', weight: 1 },
        { name: 'tags', weight: 1 },
        { name: 'category', weight: 0.5 },
        { name: 'content', weight: 0.3 },
      ],
      threshold: 0.3,
      includeMatches: true,
    });

    const rafId = requestAnimationFrame(() => {
      setAllResults(fuse.search(debouncedQuery).slice(0, MAX_RESULTS) as FuseResult[]);
      setActiveIndex(-1);
      setActiveType('All');
    });
    return () => cancelAnimationFrame(rafId);
  }, [debouncedQuery, posts]);

  // Results filtered by active type tab
  const displayedResults = useMemo(() => {
    if (activeType === 'All') return allResults;
    return allResults.filter((r) => getResultType(r.item.slug) === activeType);
  }, [allResults, activeType]);

  // Count per type for tab labels
  const typeCounts = useMemo(() => {
    const counts: Record<ContentType, number> = { All: allResults.length, Post: 0, Flow: 0, Book: 0 };
    for (const r of allResults) counts[getResultType(r.item.slug)]++;
    return counts;
  }, [allResults]);

  // Global keyboard shortcut (Cmd/Ctrl+K)
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
    }
  }, [isOpen]);

  // Click outside to close (effective on desktop; modal is full-screen on mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleNavigate(q: string) {
    if (q.trim()) {
      setRecentSearches((prev) => persistRecentSearch(q.trim(), prev));
    }
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
      router.push(getResultHref(displayedResults[activeIndex].item.slug));
      handleNavigate(query);
    }
  }

  function clearRecentSearches() {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }

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
        <div className="fixed inset-0 z-50 flex flex-col sm:items-start sm:justify-center sm:pt-24 sm:px-4 bg-background/80 backdrop-blur-sm">
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

            {/* Type filter tabs — only when results exist */}
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

            {/* Scrollable body — fills remaining height on mobile, capped on desktop */}
            <div className="flex-1 sm:flex-none overflow-y-auto min-h-0 sm:max-h-[60vh]">
              {/* Results list */}
              {displayedResults.length > 0 && (
                <ul className="py-2">
                  {displayedResults.map(({ item: post, matches }, index) => {
                    const titleMatch = matches?.find((m) => m.key === 'title');
                    const excerptMatch = matches?.find((m) => m.key === 'excerpt');
                    const type = getResultType(post.slug);
                    const isActive = index === activeIndex;

                    return (
                      <li key={post.slug}>
                        <Link
                          href={getResultHref(post.slug)}
                          onClick={() => handleNavigate(query)}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`block px-4 py-3 transition-colors ${isActive ? 'bg-muted/10' : 'hover:bg-muted/5'}`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="text-sm font-serif font-bold text-heading truncate">
                              {highlightText(post.title, titleMatch?.indices)}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-muted/60">{post.date}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TYPE_STYLES[type]}`}>
                                {type}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted mt-1 line-clamp-1">
                            {highlightText(post.excerpt, excerptMatch?.indices)}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* No results — shown only after debounce has settled to avoid flash */}
              {!isSearching && debouncedQuery && displayedResults.length === 0 && (
                <div className="p-8 text-center text-muted text-sm">
                  {t('no_results')}
                </div>
              )}

              {/* Recent searches — shown when input is empty */}
              {!query && recentSearches.length > 0 && (
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
