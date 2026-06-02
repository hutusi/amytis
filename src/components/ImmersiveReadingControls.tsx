'use client';

import {
  useImmersiveReading,
  type ReadingColumnWidth,
  type ReadingFontSize,
  type ReadingTheme,
} from '@/components/ImmersiveReadingProvider';
import { useLanguage } from '@/components/LanguageProvider';
import type { TranslationKey } from '@/i18n/translations';

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

const WIDTH_OPTIONS: Array<{ value: ReadingColumnWidth; labelKey: TranslationKey }> = [
  { value: 'narrow', labelKey: 'width_narrow' },
  { value: 'medium', labelKey: 'width_medium' },
  { value: 'wide', labelKey: 'width_wide' },
];

interface SegmentedProps<T extends string> {
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
}

function Segmented<T extends string>({ legend, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs uppercase tracking-widest text-muted/80 font-semibold">{legend}</legend>
      <div className="inline-flex rounded-md border border-muted/20 overflow-hidden bg-background">
        {options.map(opt => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={`px-3 py-1.5 text-sm font-sans transition-colors ${
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
    </fieldset>
  );
}

export default function ImmersiveReadingControls() {
  const {
    enabled,
    panelOpen,
    fontSize,
    readingTheme,
    columnWidth,
    setFontSize,
    setReadingTheme,
    setColumnWidth,
    togglePanel,
    exit,
  } = useImmersiveReading();
  const { t } = useLanguage();

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 select-none">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePanel}
          aria-expanded={panelOpen}
          aria-label={t('reading_preferences')}
          title={t('reading_preferences')}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-background/90 backdrop-blur border border-muted/20 text-foreground shadow-sm hover:bg-muted/10 transition-colors font-serif"
        >
          <span aria-hidden="true" className="text-sm">
            <span className="text-base font-bold">A</span>
            <span className="text-xs">a</span>
          </span>
        </button>
        <button
          type="button"
          onClick={exit}
          aria-label={t('exit_reading_mode')}
          title={t('exit_reading_mode')}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-background/90 backdrop-blur border border-muted/20 text-foreground shadow-sm hover:bg-muted/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {panelOpen && (
        <div className="bg-background/95 backdrop-blur-md border border-muted/20 rounded-xl shadow-xl p-4 flex flex-col gap-4 min-w-[220px]">
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
          <Segmented
            legend={t('column_width')}
            value={columnWidth}
            options={WIDTH_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
            onChange={setColumnWidth}
          />
        </div>
      )}
    </div>
  );
}
