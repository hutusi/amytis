'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { resolveLocaleValue } from '@/lib/i18n';

type LocaleValue = string | Record<string, string>;

interface HeroProps {
  tagline: LocaleValue;
  title: LocaleValue;
  subtitle: LocaleValue;
  postCount?: number;
  seriesCount?: number;
  bookCount?: number;
}

export default function Hero({ tagline, title, subtitle, postCount, seriesCount, bookCount }: HeroProps) {
  const { language } = useLanguage();
  const resolvedTagline = resolveLocaleValue(tagline, language);
  const resolvedTitle = resolveLocaleValue(title, language);
  const resolvedSubtitle = resolveLocaleValue(subtitle, language);

  const statsLine = [
    postCount ? `${postCount} posts` : null,
    seriesCount ? `${seriesCount} series` : null,
    bookCount ? `${bookCount} books` : null,
  ].filter(Boolean).join(' · ');

  return (
    <header className="relative py-16 md:py-28 flex flex-col items-center justify-center text-center max-w-6xl mx-auto min-h-[40vh] px-6">
      <div className="mb-8 flex items-center justify-center animate-fade-in">
        <span className="h-px w-12 bg-accent/30 mr-4"></span>
        <span className="text-xs font-sans font-bold uppercase tracking-[0.3em] text-accent/80">{resolvedTagline}</span>
        <span className="h-px w-12 bg-accent/30 ml-4"></span>
      </div>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-heading leading-[1.1] tracking-tight mb-10 text-balance animate-slide-up">
        {resolvedTitle}
      </h1>

      <p className="text-muted font-sans text-sm md:text-base max-w-xl mx-auto leading-relaxed opacity-80 animate-slide-up animation-delay-200">
        {resolvedSubtitle}
      </p>

      {statsLine && (
        <p className="mt-8 text-xs font-mono text-muted/50 animate-slide-up animation-delay-200">
          {statsLine}
        </p>
      )}
    </header>
  );
}
