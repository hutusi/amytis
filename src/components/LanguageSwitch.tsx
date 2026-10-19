'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from './LanguageProvider';
import { Language } from '@/i18n/translations';
import { siteConfig } from '../../site.config';
import { nextSwitchableLocale, resolveSwitchTarget } from '@/lib/locale-urls';

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

/**
 * Language switch that NAVIGATES: the locale lives in the URL, so switching
 * language means going to the page's twin in the other locale — or, when the
 * current page has no twin there, to that locale's home. Renders nothing when
 * the manifest is empty (i18n-disabled sites, and sites with no locale-tree
 * content — including the window before the locale routes exist).
 */
export default function LanguageSwitch({ variant = 'pill' }: LanguageSwitchProps) {
  const { language, twinnedPaths } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const locales = siteConfig.i18n.locales;

  if (siteConfig.i18n.enabled === false || locales.length < 2) return null;
  const hasTargets = Object.values(twinnedPaths).some(paths => paths.length > 0);
  if (!hasTargets) return null;

  const config = { locales, defaultLocale: siteConfig.i18n.defaultLocale };

  const switchTo = (target: Language) => {
    if (target === language) return;
    router.push(resolveSwitchTarget(pathname, language, target, twinnedPaths, config));
  };

  // Cycle only through switchable locales — an empty locale's home was never
  // generated, so blindly advancing to the next configured code could 404.
  const nextLocale = nextSwitchableLocale(language, twinnedPaths, config) as Language | null;
  if (!nextLocale) return null;

  // ── Text variant: quiet typographic links for the footer ──────────────────
  if (variant === 'text') {
    if (locales.length === 2) {
      const [a, b] = locales as Language[];
      return (
        <span className="flex items-center gap-1.5" role="group" aria-label="Language">
          <button
            type="button"
            onClick={() => switchTo(a)}
            aria-pressed={language === a}
            className={`text-xs font-sans tracking-wide transition-colors duration-150 ${
              language === a
                ? 'text-foreground/80 font-medium cursor-default'
                : 'text-muted hover:text-foreground/70 cursor-pointer'
            }`}
          >
            {LOCALE_LABELS[a] ?? a.toUpperCase()}
          </button>
          <span className="text-muted/25 select-none" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => switchTo(b)}
            aria-pressed={language === b}
            className={`text-xs font-sans tracking-wide transition-colors duration-150 ${
              language === b
                ? 'text-foreground/80 font-medium cursor-default'
                : 'text-muted hover:text-foreground/70 cursor-pointer'
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
        onClick={() => switchTo(nextLocale)}
        className="text-xs font-sans text-muted hover:text-foreground/80 transition-colors duration-150"
        aria-label={`Switch to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
      >
        {LOCALE_LABELS[language] ?? language.toUpperCase()}
      </button>
    );
  }

  // ── Pill variant: compact segmented pill for the navbar ───────────────────
  if (locales.length === 2) {
    const [a, b] = locales as Language[];
    return (
      <button
        onClick={() => switchTo(nextLocale)}
        className="group flex items-center rounded-full border border-line-strong bg-transparent hover:border-accent/40 transition-all duration-200"
        aria-label={`Switch language to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
        title={`Switch to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
      >
        <span
          className={`px-2 py-1 rounded-full text-[11px] font-sans font-bold tracking-wider transition-all duration-200 ${
            language === a
              ? 'text-accent bg-accent/10'
              : 'text-muted group-hover:text-foreground/60'
          }`}
        >
          {LOCALE_LABELS_SHORT[a] ?? a.toUpperCase()}
        </span>
        <span className="text-muted/25 text-[10px] select-none -mx-0.5" aria-hidden="true">·</span>
        <span
          className={`px-2 py-1 rounded-full text-[11px] font-sans font-bold tracking-wider transition-all duration-200 ${
            language === b
              ? 'text-accent bg-accent/10'
              : 'text-muted group-hover:text-foreground/60'
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
      onClick={() => switchTo(nextLocale)}
      className="w-8 h-8 flex items-center justify-center text-foreground/80 hover:text-accent transition-colors duration-200 text-[11px] font-sans font-bold tracking-wider"
      aria-label={`Language: ${LOCALE_LABELS_SHORT[language] ?? language}. Click to switch to ${LOCALE_LABELS_SHORT[nextLocale] ?? nextLocale}`}
    >
      {LOCALE_LABELS_SHORT[language] ?? language.toUpperCase()}
    </button>
  );
}
