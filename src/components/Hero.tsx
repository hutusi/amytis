'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { resolveLocaleValue } from '@/lib/i18n';

type LocaleValue = string | Record<string, string>;

interface HeroProps {
  tagline: LocaleValue;
  title: LocaleValue;
  subtitle: LocaleValue;
}

export default function Hero({ tagline, title, subtitle }: HeroProps) {
  const { language } = useLanguage();
  const resolvedTagline = resolveLocaleValue(tagline, language);
  const resolvedTitle = resolveLocaleValue(title, language);
  const resolvedSubtitle = resolveLocaleValue(subtitle, language);
  const [isVisible, setIsVisible] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('amytis-hero-visible');
      return saved !== 'false';
    }
    return null;
  });
  const visibleRef = useRef(isVisible ?? false);

  // Auto-collapse on scroll or navigation away
  useEffect(() => {
    if (!isVisible) return;

    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(false);
        visibleRef.current = false;
        localStorage.setItem('amytis-hero-visible', 'false');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // On unmount (navigation away), hide for next visit
      if (visibleRef.current) {
        localStorage.setItem('amytis-hero-visible', 'false');
      }
    };
  }, [isVisible]);

  const handleCollapse = () => {
    setIsVisible(false);
    visibleRef.current = false;
    localStorage.setItem('amytis-hero-visible', 'false');
  };

  const handleExpand = () => {
    setIsVisible(true);
    visibleRef.current = true;
    localStorage.setItem('amytis-hero-visible', 'true');
  };

  // Avoid layout shift on first render
  if (isVisible === null) {
    return <div className="min-h-[60vh]" />;
  }

  if (!isVisible) {
    return (
      <div className="py-10">
        <button
          onClick={handleExpand}
          className="mx-auto flex items-center justify-center gap-4 group cursor-pointer"
        >
          <span className="h-px w-12 bg-muted/20 group-hover:bg-accent/40 transition-colors" />
          <span className="text-xs font-sans font-bold uppercase tracking-[0.3em] text-muted/40 group-hover:text-accent/80 transition-colors">
            {resolvedTagline}
          </span>
          <span className="h-px w-12 bg-muted/20 group-hover:bg-accent/40 transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <header className="relative py-24 md:py-40 flex flex-col items-center justify-center text-center max-w-6xl mx-auto min-h-[60vh] px-6">
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

      {/* Collapse button */}
      <button
        onClick={handleCollapse}
        className="absolute top-4 right-4 text-muted/30 hover:text-accent transition-colors p-2"
        aria-label="Collapse intro"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted/30">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
        </svg>
      </div>
    </header>
  );
}
