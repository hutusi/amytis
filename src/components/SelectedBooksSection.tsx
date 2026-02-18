'use client';

import Link from 'next/link';
import CoverImage from './CoverImage';
import { useLanguage } from './LanguageProvider';

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
}

export default function SelectedBooksSection({ books }: SelectedBooksSectionProps) {
  const { t } = useLanguage();

  if (books.length === 0) return null;

  return (
    <section className="mb-24">
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-serif font-bold text-heading">{t('selected_books')}</h2>
        <Link href="/books" className="text-sm font-sans font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline hover:underline">
          {t('all_books')} →
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {books.map(book => (
          <Link key={book.slug} href={`/books/${book.slug}`} className="group block no-underline">
            <div className="card-base h-full group flex flex-col p-0 overflow-hidden">
              <div className="relative h-48 w-full overflow-hidden bg-muted/10">
                <CoverImage
                  src={book.coverImage}
                  title={book.title}
                  slug={book.slug}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-8 flex flex-col flex-1">
                <span className="badge-accent mb-4 inline-block">
                  {book.chapterCount} {t('chapters_count')}
                </span>
                <h3 className="mb-3 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors">
                  {book.title}
                </h3>
                {book.authors.length > 0 && (
                  <p className="text-xs text-muted mb-3">
                    {t('written_by')} {book.authors.slice(0, 3).join(', ')}
                  </p>
                )}
                {book.excerpt && (
                  <p className="text-muted font-serif italic leading-relaxed line-clamp-3">
                    {book.excerpt}
                  </p>
                )}
                {book.firstChapter && (
                  <div className="mt-auto pt-6 border-t border-muted/10">
                    <span className="text-sm font-sans font-bold text-accent flex items-center gap-1.5">
                      {t('start_reading')}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
