'use client';

import { useLanguage } from './LanguageProvider';
import { siteConfig } from '../../site.config';

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  zh: '中文',
};

// Short labels for the compact navbar pill
const LOCALE_LABELS_SHORT: Record<string, string> = {
  en: 'EN',
  zh: '中',
};

interface LanguageSwitchProps {
  /** pill — compact segmented pill for the navbar (default)
   *  text — lightweight typographic links for the footer */
  variant?: 'pill' | 'text';
}

export default function LanguageSwitch({ variant = 'pill' }: LanguageSwitchProps) {
  const { language, setLanguage, isHydrated } = useLanguage();
  const locales = siteConfig.i18n.locales;

  if (locales.length < 2) return null;

  // SSR placeholder — reserve space to avoid layout shift
  if (!isHydrated) {
    return <div className={variant === 'pill' ? 'w-[52px] h-8' : 'w-16 h-4'} aria-hidden="true" />;
  }

  const currentIndex = locales.indexOf(language);
  const nextLocale = locales[(currentIndex + 1) % locales.length];

  // ── Text variant: quiet typographic links for the footer ──────────────────
  if (variant === 'text') {
    if (locales.length === 2) {
      const [a, b] = locales;
      return (
        <span className="flex items-center gap-1.5" role="group" aria-label="Language">
          <button
            type="button"
            onClick={() => setLanguage(a)}
            aria-pressed={language === a}
            className={`text-xs font-sans tracking-wide transition-colors duration-150 ${
              language === a
                ? 'text-foreground/80 font-medium cursor-default'
                : 'text-muted/50 hover:text-foreground/70 cursor-pointer'
            }`}
          >
            {LOCALE_LABELS[a] ?? a.toUpperCase()}
          </button>
          <span className="text-muted/25 select-none" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => setLanguage(b)}
            aria-pressed={language === b}
            className={`text-xs font-sans tracking-wide transition-colors duration-150 ${
              language === b
                ? 'text-foreground/80 font-medium cursor-default'
                : 'text-muted/50 hover:text-foreground/70 cursor-pointer'
            }`}
          >
            {LOCALE_LABELS[b] ?? b.toUpperCase()}
          </button>
        </span>
      );
    }
    // 3+ locales text fallback: cycle on click
    return (
      <button
        type="button"
        onClick={() => setLanguage(nextLocale)}
        className="text-xs font-sans text-muted/60 hover:text-foreground/80 transition-colors duration-150"
        aria-label={`Switch to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
      >
        {LOCALE_LABELS[language] ?? language.toUpperCase()}
      </button>
    );
  }

  // ── Pill variant: compact segmented pill for the navbar ───────────────────
  if (locales.length === 2) {
    const [a, b] = locales;
    return (
      <button
        onClick={() => setLanguage(nextLocale)}
        className="group flex items-center rounded-full border border-muted/20 bg-transparent hover:border-accent/40 transition-all duration-200"
        aria-label={`Switch language to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
        title={`Switch to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
      >
        <span
          className={`px-2 py-1 rounded-full text-[11px] font-sans font-bold tracking-wider transition-all duration-200 ${
            language === a
              ? 'text-accent bg-accent/10'
              : 'text-muted/50 group-hover:text-foreground/60'
          }`}
        >
          {LOCALE_LABELS_SHORT[a] ?? a.toUpperCase()}
        </span>
        <span className="text-muted/25 text-[10px] select-none -mx-0.5" aria-hidden="true">·</span>
        <span
          className={`px-2 py-1 rounded-full text-[11px] font-sans font-bold tracking-wider transition-all duration-200 ${
            language === b
              ? 'text-accent bg-accent/10'
              : 'text-muted/50 group-hover:text-foreground/60'
          }`}
        >
          {LOCALE_LABELS_SHORT[b] ?? b.toUpperCase()}
        </span>
      </button>
    );
  }

  // 3+ locales pill fallback: show current, click cycles
  return (
    <button
      onClick={() => setLanguage(nextLocale)}
      className="w-8 h-8 flex items-center justify-center text-foreground/80 hover:text-accent transition-colors duration-200 text-[11px] font-sans font-bold tracking-wider"
      aria-label={`Language: ${LOCALE_LABELS_SHORT[language] ?? language}. Click to switch to ${LOCALE_LABELS_SHORT[nextLocale] ?? nextLocale}`}
    >
      {LOCALE_LABELS_SHORT[language] ?? language.toUpperCase()}
    </button>
  );
}
