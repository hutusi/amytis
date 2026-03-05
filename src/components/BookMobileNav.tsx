'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookTocItem, BookChapterEntry } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';
import PrevNextNav from './PrevNextNav';
import { getBookChapterUrl } from '@/lib/urls';

interface BookMobileNavProps {
  bookSlug: string;
  bookTitle: string;
  toc: BookTocItem[];
  chapters: BookChapterEntry[];
  currentChapter: string;
}

export default function BookMobileNav({ bookSlug, bookTitle, toc, chapters, currentChapter }: BookMobileNavProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentIndex = chapters.findIndex(ch => ch.id === currentChapter);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <div className="lg:hidden p-5 bg-muted/5 rounded-xl border border-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/books/${bookSlug}`} className="group flex items-center gap-2 no-underline">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent">
            {t('book')}
          </span>
          <span className="text-[10px] text-muted">&bull;</span>
          <span className="text-sm font-serif font-bold text-heading group-hover:text-accent transition-colors">
            {bookTitle}
          </span>
        </Link>
        <span className="text-xs font-mono text-muted bg-muted/10 px-2 py-0.5 rounded-full">
          {currentIndex + 1}/{chapters.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/10 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-accent/60 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / chapters.length) * 100}%` }}
        />
      </div>

      {/* Prev / Next */}
      <div className="mb-3">
        <PrevNextNav
          prev={prevChapter ? { href: getBookChapterUrl(bookSlug, prevChapter.id), title: prevChapter.title } : null}
          next={nextChapter ? { href: getBookChapterUrl(bookSlug, nextChapter.id), title: nextChapter.title } : null}
        />
      </div>

      {/* Toggle to expand full chapter list */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-sans text-muted hover:text-accent transition-colors"
      >
        <span className="h-px flex-1 bg-muted/10" />
        <span className="flex items-center gap-1">
          {isExpanded ? t('hide') : t('chapters_count')}
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        <span className="h-px flex-1 bg-muted/10" />
      </button>

      {/* Collapsible chapter list */}
      {isExpanded && (
        <div className="mt-3 space-y-2 animate-slide-down">
          {toc.map((item, tocIdx) => {
            if ('part' in item) {
              return (
                <div key={`part-${tocIdx}`}>
                  <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted px-2 py-1.5">
                    {item.part}
                  </div>
                  <ol className="space-y-1">
                    {item.chapters.map(ch => {
                      const isCurrent = ch.id === currentChapter;
                      const chIdx = chapters.findIndex(c => c.id === ch.id);
                      const isPast = chIdx < currentIndex;

                      return (
                        <li key={ch.id}>
                          {isCurrent ? (
                            <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-accent/5">
                              <span className="text-sm font-semibold text-accent truncate">{ch.title}</span>
                            </div>
                          ) : (
                            <Link
                              href={`/books/${bookSlug}/${ch.id}`}
                              className={`block py-1.5 px-2 rounded-lg text-sm no-underline hover:bg-muted/5 transition-colors ${
                                isPast ? 'text-foreground/70 hover:text-foreground' : 'text-muted hover:text-foreground'
                              }`}
                            >
                              {ch.title}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            } else {
              const isCurrent = item.id === currentChapter;
              const chIdx = chapters.findIndex(c => c.id === item.id);
              const isPast = chIdx < currentIndex;

              return (
                <div key={item.id}>
                  {isCurrent ? (
                    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-accent/5">
                      <span className="text-sm font-semibold text-accent truncate">{item.title}</span>
                    </div>
                  ) : (
                    <Link
                      href={`/books/${bookSlug}/${item.id}`}
                      className={`block py-1.5 px-2 rounded-lg text-sm no-underline hover:bg-muted/5 transition-colors ${
                        isPast ? 'text-foreground/70 hover:text-foreground' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {item.title}
                    </Link>
                  )}
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
