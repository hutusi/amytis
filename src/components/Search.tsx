"use client";

import React, { useState, useEffect, useRef } from 'react';
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

function getResultHref(slug: string): string {
  if (slug.startsWith('books/') || slug.startsWith('flows/')) return `/${slug}`;
  return `/posts/${slug}`;
}

function getResultType(slug: string): 'Post' | 'Flow' | 'Book' {
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

export default function Search() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FuseResult[]>([]);
  const [posts, setPosts] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Load search index (lazy, once)
  useEffect(() => {
    if (isOpen && posts.length === 0) {
      fetch('/search.json')
        .then((res) => res.json())
        .then((data) => setPosts(data))
        .catch((err) => console.error('Failed to load search index', err));
    }
  }, [isOpen, posts.length]);

  // Perform search
  useEffect(() => {
    if (!query) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const fuse = new Fuse(posts, {
      keys: ['title', 'excerpt', 'tags', 'category'],
      threshold: 0.3,
      includeMatches: true,
    });

    const rafId = requestAnimationFrame(() => {
      setResults(fuse.search(query).slice(0, 8) as FuseResult[]);
      setActiveIndex(-1);
    });
    return () => cancelAnimationFrame(rafId);
  }, [query, posts]);

  // Global keyboard shortcuts
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

  // Focus input on open; reset state on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setActiveIndex(-1);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      router.push(getResultHref(results[activeIndex].item.slug));
      setIsOpen(false);
    }
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-sm transition-opacity">
          <div
            ref={searchRef}
            className="w-full max-w-xl bg-background border border-muted/20 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center px-4 py-3 border-b border-muted/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted mr-3"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search_placeholder')}
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              <div className="text-xs text-muted border border-muted/20 px-1.5 py-0.5 rounded">ESC</div>
            </div>

            {results.length > 0 && (
              <ul className="py-2 max-h-[60vh] overflow-y-auto">
                {results.map(({ item: post, matches }, index) => {
                  const titleMatch = matches?.find((m) => m.key === 'title');
                  const excerptMatch = matches?.find((m) => m.key === 'excerpt');
                  const type = getResultType(post.slug);
                  const isActive = index === activeIndex;

                  return (
                    <li key={post.slug}>
                      <Link
                        href={getResultHref(post.slug)}
                        onClick={() => setIsOpen(false)}
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

            {query && results.length === 0 && (
              <div className="p-8 text-center text-muted text-sm">
                {t('no_results')}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
