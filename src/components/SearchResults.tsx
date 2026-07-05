"use client";

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import type { ContentType } from '@/lib/search-utils';
import type { DisplayResult } from '@/hooks/usePagefind';

const TYPE_STYLES: Record<string, string> = {
  Flow: 'border-accent/30 text-accent',
  Book: 'border-foreground/30 text-foreground/60',
  Post: 'border-line-strong text-muted',
  Note: 'border-emerald-400/30 text-emerald-600 dark:text-emerald-400',
};

interface SearchResultsProps {
  /** Results for the active type tab, already capped at `maxResults`. */
  displayedResults: DisplayResult[];
  /** Total matches for the active tab before capping. */
  totalFilteredCount: number;
  /** Cap applied to `displayedResults` — the count footer shows when exceeded. */
  maxResults: number;
  /** Index of the keyboard-highlighted option, -1 for none. */
  activeIndex: number;
  /** id of the listbox, referenced by the combobox input's aria-controls. */
  listboxId: string;
  /** id per option, referenced by the input's aria-activedescendant. */
  optionId: (index: number) => string;
  /** Show the "no results" block. */
  showNoResults: boolean;
  /** Localized label for a result's type badge. */
  getTypeLabel: (type: Exclude<ContentType, 'All'>) => string;
  /** Called when a result link is clicked (persist recent search, close modal). */
  onResultClick: () => void;
  /** Called on pointer hover to sync the active option with the mouse. */
  onResultHover: (index: number) => void;
}

/**
 * Presentational results section of the search modal: the combobox-owned
 * listbox, the capped-count footer, and the no-results block. All state
 * lives in `Search`.
 */
export default function SearchResults({
  displayedResults,
  totalFilteredCount,
  maxResults,
  activeIndex,
  listboxId,
  optionId,
  showNoResults,
  getTypeLabel,
  onResultClick,
  onResultHover,
}: SearchResultsProps) {
  const { t, tWith } = useLanguage();

  return (
    <>
      {/* Results — listbox owned by the combobox input via
          aria-controls/aria-activedescendant */}
      {displayedResults.length > 0 && (
        <ul className="py-2" id={listboxId} role="listbox" aria-label={t('search_label')}>
          {displayedResults.map((result, index) => (
            <li
              key={result.url}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
            >
              <Link
                href={result.url}
                onClick={onResultClick}
                onMouseEnter={() => onResultHover(index)}
                tabIndex={-1}
                className={`block px-4 py-3 transition-colors ${index === activeIndex ? 'bg-surface-soft' : 'hover:bg-surface-soft'}`}
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
                      {getTypeLabel(result.type)}
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

      {/* Result count when capped */}
      {displayedResults.length > 0 && totalFilteredCount > maxResults && (
        <div className="px-4 py-2 text-[11px] text-muted/60 border-t border-line text-center">
          {tWith('search_showing', { shown: displayedResults.length, total: totalFilteredCount })}
        </div>
      )}

      {/* No results */}
      {showNoResults && (
        <div className="p-8 text-center text-muted text-sm">{t('no_results')}</div>
      )}
    </>
  );
}
