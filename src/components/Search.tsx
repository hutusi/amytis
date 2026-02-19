"use client";

import React, { useState, useEffect, useRef } from 'react';
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

export default function Search() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [posts, setPosts] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Load search index
  useEffect(() => {
    if (isOpen && posts.length === 0) {
      fetch('/search.json')
        .then((res) => res.json())
        .then((data) => setPosts(data))
        .catch((err) => console.error("Failed to load search index", err));
    }
  }, [isOpen, posts.length]);

  // Perform search
  useEffect(() => {
    if (!query) {
      return;
    }

    const fuse = new Fuse(posts, {
      keys: ['title', 'excerpt', 'tags', 'category'],
      threshold: 0.3,
    });

    const searchResults = fuse.search(query).map((result) => result.item);
    // Wrap in requestAnimationFrame to avoid cascading render lint error
    const rafId = requestAnimationFrame(() => {
      setResults(searchResults.slice(0, 5)); // Limit to 5 results
    });
    return () => cancelAnimationFrame(rafId);
  }, [query, posts]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) setResults([]);
                }}
              />
              <div className="text-xs text-muted border border-muted/20 px-1.5 py-0.5 rounded">ESC</div>
            </div>

            {results.length > 0 && (
              <ul className="py-2 max-h-[60vh] overflow-y-auto">
                {results.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={post.slug.startsWith('books/') || post.slug.startsWith('flows/') ? `/${post.slug}` : `/posts/${post.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-3 hover:bg-muted/5 transition-colors"
                    >
                      <div className="text-sm font-serif font-bold text-heading">{post.title}</div>
                      <div className="text-xs text-muted mt-1 line-clamp-1">{post.excerpt}</div>
                    </Link>
                  </li>
                ))}
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
