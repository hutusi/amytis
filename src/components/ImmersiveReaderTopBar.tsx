'use client';

import Link from 'next/link';
import {
  useImmersiveReading,
  type ReadingFontSize,
  type ReadingTheme,
} from '@/components/ImmersiveReadingProvider';
import { useLanguage } from '@/components/LanguageProvider';
import type { TranslationKey } from '@/i18n/translations';
import { getBookUrl } from '@/lib/urls';

interface ImmersiveReaderTopBarProps {
  bookSlug: string;
  bookTitle: string;
  chapterTitle: string;
}

const FONT_SIZE_OPTIONS: Array<{ value: ReadingFontSize; labelKey: TranslationKey }> = [
  { value: 's', labelKey: 'size_small' },
  { value: 'm', labelKey: 'size_medium' },
  { value: 'l', labelKey: 'size_large' },
  { value: 'xl', labelKey: 'size_xl' },
];

const THEME_OPTIONS: Array<{ value: ReadingTheme; labelKey: TranslationKey }> = [
  { value: 'auto', labelKey: 'theme_auto' },
  { value: 'light', labelKey: 'theme_light' },
  { value: 'sepia', labelKey: 'theme_sepia' },
  { value: 'dark', labelKey: 'theme_dark' },
];

interface SegmentedProps<T extends string> {
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
}

function Segmented<T extends string>({ legend, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={legend}
      className="inline-flex rounded-md border border-muted/20 overflow-hidden bg-background/50"
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            title={`${legend}: ${opt.label}`}
            className={`px-2.5 py-1 text-xs font-sans transition-colors ${
              active
                ? 'bg-accent text-background'
                : 'text-foreground/80 hover:bg-muted/10'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ImmersiveReaderTopBar({
  bookSlug,
  bookTitle,
  chapterTitle,
}: ImmersiveReaderTopBarProps) {
  const { t } = useLanguage();
  const {
    fontSize,
    readingTheme,
    sidebarOpen,
    setFontSize,
    setReadingTheme,
    toggleSidebar,
    exit,
  } = useImmersiveReading();

  return (
    <header className="h-12 flex items-center gap-3 px-3 border-b border-muted/15 bg-background/95 backdrop-blur-md shrink-0">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-pressed={sidebarOpen}
        aria-label={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
        title={sidebarOpen ? t('collapse_sidebar') : t('expand_sidebar')}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/80 hover:text-accent hover:bg-muted/10 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="min-w-0 flex-1 flex items-center gap-2 text-sm">
        <Link
          href={getBookUrl(bookSlug)}
          className="font-serif font-semibold text-heading hover:text-accent truncate no-underline"
          title={bookTitle}
        >
          {bookTitle}
        </Link>
        <span className="text-muted/50 hidden sm:inline" aria-hidden="true">/</span>
        <span className="text-muted truncate hidden sm:inline" title={chapterTitle}>
          {chapterTitle}
        </span>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Segmented
          legend={t('font_size')}
          value={fontSize}
          options={FONT_SIZE_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
          onChange={setFontSize}
        />
        <Segmented
          legend={t('reading_theme')}
          value={readingTheme}
          options={THEME_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
          onChange={setReadingTheme}
        />
      </div>

      <button
        type="button"
        onClick={exit}
        aria-label={t('exit_reading_mode')}
        title={t('exit_reading_mode')}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/80 hover:text-accent hover:bg-muted/10 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>
  );
}
