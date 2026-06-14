'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import CoverImage from './CoverImage';
import HorizontalScroll from './HorizontalScroll';
import SectionHeading from './ui/SectionHeading';
import { useLanguage } from './LanguageProvider';
import { shuffle } from '@/lib/shuffle';
import { byDateAsc, byDateDesc } from '@/lib/sort';
import { getBooksListUrl, getBookUrl, getBookChapterUrl } from '@/lib/urls';
import { cn } from '@/lib/cn';
import { COVER_ZOOM } from '@/lib/ui-classes';

export interface BookItem {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  authors: string[];
  chapterCount: number;
  firstChapter?: string;
  date: string;
}

type BookOrder = 'shuffle' | 'date-desc' | 'date-asc';

interface SelectedBooksSectionProps {
  books: BookItem[];
  maxItems?: number;
  order?: BookOrder;
}

function canonicalOrder(books: BookItem[], order: BookOrder): BookItem[] {
  if (order === 'date-desc') return [...books].sort(byDateDesc);
  if (order === 'date-asc')  return [...books].sort(byDateAsc);
  // For 'shuffle': SSR-stable canonical order (input is already date-desc from getAllBooks).
  // The post-mount useEffect swaps to a random permutation on the client.
  return books;
}

export default function SelectedBooksSection({ books, maxItems = 4, order = 'shuffle' }: SelectedBooksSectionProps) {
  const { t } = useLanguage();
  const [displayed, setDisplayed] = useState(() => canonicalOrder(books, order).slice(0, maxItems));

  // Shuffle on mount so every reload re-rolls. SSR's canonical render is stable; the
  // post-hydration swap is the intentional client-only behaviour, not a sync issue.
  useEffect(() => {
    if (order === 'shuffle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayed(shuffle(books).slice(0, maxItems));
    }
  }, [books, maxItems, order]);

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(books).slice(0, maxItems));
  }, [books, maxItems]);

  if (books.length === 0) return null;

  return (
    <section id="featured-books" className="mb-12 sm:mb-24">
      <div className="flex items-center justify-between mb-8">
        <SectionHeading>{t('selected_books')}</SectionHeading>
        <div className="flex items-center gap-4">
          {order === 'shuffle' && books.length > maxItems && (
            <button
              onClick={handleShuffle}
              className="rounded-sm text-sm text-muted transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
              aria-label={t('shuffle_books')}
              title={t('shuffle_books')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>
          )}
          <Link href={getBooksListUrl()} className="text-sm text-muted hover:text-accent transition-colors no-underline">
            {t('all_books')} →
          </Link>
        </div>
      </div>
      <HorizontalScroll>
        <div className={`flex gap-8 ${displayed.length > 1 ? 'pb-4' : ''}`}>
          {displayed.map((book, idx) => (
            <div
              key={book.slug}
              className={`card-base group flex flex-col p-0 overflow-hidden snap-start ${
                displayed.length > 1
                  ? 'w-[85vw] md:w-[calc(50%-1rem)] flex-shrink-0'
                  : 'flex-1 md:max-w-[calc(50%-1rem)]'
              }`}
            >
              <Link href={getBookUrl(book.slug)} className="relative h-44 w-full overflow-hidden bg-ink/[0.04] block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-inset">
                <CoverImage
                  src={book.coverImage}
                  title={book.title}
                  slug={book.slug}
                  className={cn(COVER_ZOOM, 'duration-700')}
                  loading={idx === 0 ? 'eager' : undefined}
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
              </Link>
              <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                  <span className="badge-accent">
                    {book.chapterCount} {t('chapters_count')}
                  </span>
                </div>
                <h3 className="mb-2 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors line-clamp-2">
                  <Link href={getBookUrl(book.slug)} className="no-underline focus:outline-none focus:text-accent">
                    {book.title}
                  </Link>
                </h3>
                {book.authors.length > 0 && (
                  <p className="text-xs text-muted mb-3">
                    {t('written_by')} {book.authors.slice(0, 3).join(', ')}
                  </p>
                )}
                {book.excerpt && (
                  <p className="mb-6 text-muted font-serif italic line-clamp-2 text-base">
                    {book.excerpt}
                  </p>
                )}
                {book.firstChapter && (
                  <div className="mt-auto pt-6 border-t border-ink/[0.05]">
                    <Link
                      href={getBookChapterUrl(book.slug, book.firstChapter)}
                      className="text-sm font-sans font-bold text-accent flex items-center gap-1.5 no-underline hover:gap-2.5 transition-all"
                    >
                      {t('start_reading')}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </HorizontalScroll>
    </section>
  );
}
