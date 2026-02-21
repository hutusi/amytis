'use client';

import { useLanguage } from './LanguageProvider';
import { siteConfig } from '../../site.config';

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  zh: '中',
};

export default function LanguageSwitch() {
  const { language, setLanguage, isHydrated } = useLanguage();
  const locales = siteConfig.i18n.locales;

  if (locales.length < 2) return null;

  // SSR placeholder — reserve space to avoid layout shift
  if (!isHydrated) {
    return <div className="w-[52px] h-8" aria-hidden="true" />;
  }

  const currentIndex = locales.indexOf(language);
  const nextLocale = locales[(currentIndex + 1) % locales.length];

  // Two-locale segmented pill: both labels visible, active one highlighted
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
          {LOCALE_LABELS[a] ?? a.toUpperCase()}
        </span>
        <span className="text-muted/25 text-[10px] select-none -mx-0.5" aria-hidden="true">·</span>
        <span
          className={`px-2 py-1 rounded-full text-[11px] font-sans font-bold tracking-wider transition-all duration-200 ${
            language === b
              ? 'text-accent bg-accent/10'
              : 'text-muted/50 group-hover:text-foreground/60'
          }`}
        >
          {LOCALE_LABELS[b] ?? b.toUpperCase()}
        </span>
      </button>
    );
  }

  // 3+ locales fallback: show current language, click cycles through
  return (
    <button
      onClick={() => setLanguage(nextLocale)}
      className="w-8 h-8 flex items-center justify-center text-foreground/80 hover:text-accent transition-colors duration-200 text-[11px] font-sans font-bold tracking-wider"
      aria-label={`Language: ${LOCALE_LABELS[language] ?? language}. Click to switch to ${LOCALE_LABELS[nextLocale] ?? nextLocale}`}
    >
      {LOCALE_LABELS[language] ?? language.toUpperCase()}
    </button>
  );
}
