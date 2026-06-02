'use client';

import { useEffect, useRef, type RefObject } from 'react';
import {
  useImmersiveReading,
  type ReadingColumnWidth,
  type ReadingFontSize,
  type ReadingTheme,
} from '@/components/ImmersiveReadingProvider';
import { useLanguage } from '@/components/LanguageProvider';
import type { TranslationKey } from '@/i18n/translations';

interface ImmersiveReadingPrefsPopoverProps {
  /** The toggle button — its ref is excluded from outside-click closing so the
   * button's onClick is the single source of truth for toggling. */
  toggleButtonRef: RefObject<HTMLElement | null>;
}

const FONT_PREVIEW_PX: Record<ReadingFontSize, number> = {
  s: 12,
  m: 15,
  l: 19,
  xl: 24,
};

const FONT_OPTIONS: Array<{ value: ReadingFontSize; labelKey: TranslationKey }> = [
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

const WIDTH_OPTIONS: Array<{ value: ReadingColumnWidth; labelKey: TranslationKey; barWidthPct: number }> = [
  { value: 'narrow', labelKey: 'width_narrow', barWidthPct: 35 },
  { value: 'medium', labelKey: 'width_medium', barWidthPct: 55 },
  { value: 'wide', labelKey: 'width_wide', barWidthPct: 75 },
  { value: 'full', labelKey: 'width_full', barWidthPct: 100 },
];

// Tailwind classes baked into the theme swatch — concrete hex / vars so the
// reader sees the actual colours, not an approximation.
const THEME_SWATCH_STYLE: Record<ReadingTheme, string> = {
  auto: 'bg-gradient-to-br from-stone-50 from-50% to-stone-800 to-50% text-stone-700',
  light: 'bg-stone-50 text-stone-900',
  sepia: 'bg-[#f4ecd8] text-[#3b2f24]',
  dark: 'bg-stone-800 text-stone-100',
};

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted/80 mb-2">
      {children}
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  ariaLabel,
  title,
  children,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title}
      className={`relative flex items-center justify-center rounded-lg transition-all duration-150 ${
        active
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
          : 'ring-1 ring-muted/20 hover:ring-muted/40'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function ImmersiveReadingPrefsPopover({ toggleButtonRef }: ImmersiveReadingPrefsPopoverProps) {
  const { t } = useLanguage();
  const {
    prefsPanelOpen,
    fontSize,
    readingTheme,
    columnWidth,
    setFontSize,
    setReadingTheme,
    setColumnWidth,
    closePrefsPanel,
  } = useImmersiveReading();

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefsPanelOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (toggleButtonRef.current?.contains(target)) return;
      closePrefsPanel();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [prefsPanelOpen, closePrefsPanel, toggleButtonRef]);

  if (!prefsPanelOpen) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={t('reading_preferences')}
      className="absolute top-full right-0 mt-2 z-50 min-w-[280px] bg-background/95 backdrop-blur-md border border-muted/20 rounded-xl shadow-xl p-5 animate-slide-down"
    >
      {/* Font Size */}
      <div className="mb-5">
        <GroupHeading>{t('font_size')}</GroupHeading>
        <div className="grid grid-cols-4 gap-2">
          {FONT_OPTIONS.map(opt => {
            const active = opt.value === fontSize;
            return (
              <OptionButton
                key={opt.value}
                active={active}
                onClick={() => setFontSize(opt.value)}
                ariaLabel={`${t('font_size')}: ${t(opt.labelKey)}`}
                title={t(opt.labelKey)}
                className="h-12 bg-background"
              >
                <span
                  aria-hidden="true"
                  className="font-serif font-semibold text-foreground leading-none"
                  style={{ fontSize: `${FONT_PREVIEW_PX[opt.value]}px` }}
                >
                  A
                </span>
              </OptionButton>
            );
          })}
        </div>
      </div>

      {/* Theme */}
      <div className="mb-5">
        <GroupHeading>{t('reading_theme')}</GroupHeading>
        <div className="grid grid-cols-4 gap-2">
          {THEME_OPTIONS.map(opt => {
            const active = opt.value === readingTheme;
            return (
              <OptionButton
                key={opt.value}
                active={active}
                onClick={() => setReadingTheme(opt.value)}
                ariaLabel={`${t('reading_theme')}: ${t(opt.labelKey)}`}
                title={t(opt.labelKey)}
                className="flex-col h-14 overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className={`flex-1 w-full flex items-center justify-center text-[13px] font-serif font-semibold ${THEME_SWATCH_STYLE[opt.value]}`}
                >
                  Aa
                </span>
                <span className="block w-full text-[9px] text-muted py-0.5 bg-background border-t border-muted/15">
                  {t(opt.labelKey)}
                </span>
              </OptionButton>
            );
          })}
        </div>
      </div>

      {/* Width */}
      <div>
        <GroupHeading>{t('column_width')}</GroupHeading>
        <div className="grid grid-cols-4 gap-2">
          {WIDTH_OPTIONS.map(opt => {
            const active = opt.value === columnWidth;
            return (
              <OptionButton
                key={opt.value}
                active={active}
                onClick={() => setColumnWidth(opt.value)}
                ariaLabel={`${t('column_width')}: ${t(opt.labelKey)}`}
                title={t(opt.labelKey)}
                className="h-12 bg-background"
              >
                <span
                  aria-hidden="true"
                  className="flex flex-col items-center justify-center gap-1 w-full"
                >
                  <span
                    className="block h-0.5 bg-foreground/70 rounded-full"
                    style={{ width: `${opt.barWidthPct}%` }}
                  />
                  <span
                    className="block h-0.5 bg-foreground/40 rounded-full"
                    style={{ width: `${opt.barWidthPct}%` }}
                  />
                  <span
                    className="block h-0.5 bg-foreground/40 rounded-full"
                    style={{ width: `${opt.barWidthPct}%` }}
                  />
                </span>
              </OptionButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
