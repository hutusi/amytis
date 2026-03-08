'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import CoverImage from './CoverImage';
import HorizontalScroll from './HorizontalScroll';
import { useLanguage } from './LanguageProvider';
import { shuffle, shuffleSeeded } from '@/lib/shuffle';
import { getBooksListUrl, getBookUrl, getBookChapterUrl } from '@/lib/urls';

export interface BookItem {
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  authors: string[];
  chapterCount: number;
  firstChapter?: string;
}

interface SelectedBooksSectionProps {
  books: BookItem[];
  maxItems?: number;
}

export default function SelectedBooksSection({ books, maxItems = 4 }: SelectedBooksSectionProps) {
  const { t } = useLanguage();
  const [displayed, setDisplayed] = useState(() => {
    const dailySeed = Math.floor(Date.now() / 86400000);
    return shuffleSeeded(books, dailySeed).slice(0, maxItems);
  });

  const handleShuffle = useCallback(() => {
    setDisplayed(shuffle(books).slice(0, maxItems));
  }, [books, maxItems]);

  if (books.length === 0) return null;

  return (
    <section id="featured-books" className="mb-12 sm:mb-24">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-heading">{t('selected_books')}</h2>
        <div className="flex items-center gap-4">
          {books.length > maxItems && (
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
              <Link href={getBookUrl(book.slug)} className="relative h-44 w-full overflow-hidden bg-muted/10 block focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-inset">
                <CoverImage
                  src={book.coverImage}
                  title={book.title}
                  slug={book.slug}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
                  <div className="mt-auto pt-6 border-t border-muted/10">
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
