'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { siteConfig } from '../../site.config';
import ThemeToggle from './ThemeToggle';
import Search from '@/components/Search';
import { useLanguage } from '@/components/LanguageProvider';
import { resolveLocaleValue } from '@/lib/i18n';
import { TranslationKey } from '@/i18n/translations';

interface NavItem {
  name: string;
  slug: string;
}

interface NavbarProps {
  seriesList?: NavItem[];
  booksList?: NavItem[];
}

export default function Navbar({ seriesList = [], booksList = [] }: NavbarProps) {
  const { t, language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navItems = [...siteConfig.nav].sort((a, b) => a.weight - b.weight);

  const getLabel = (name: string): string => {
    const key = name.toLowerCase() as TranslationKey;
    const translated = t(key);
    return translated !== key ? translated : name;
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-muted/10 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-serif font-bold text-heading hover:text-accent transition-colors duration-200"
        >
          <svg
            viewBox="0 0 32 32"
            className="w-8 h-8 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M16 4 L7 28" />
            <path d="M16 4 L25 28" />
            <path d="M11.5 18 H 20.5" />
            <path d="M20.5 18 Q 26 14 26 8 Q 23 12 20.5 18" fill="currentColor" stroke="none" />
          </svg>
          <span>{resolveLocaleValue(siteConfig.title, language)}</span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isExternal = !!('external' in item && item.external);
              const Component = isExternal ? 'a' : Link;
              const props = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

              if (item.name === 'Books' && booksList.length > 0) {
                return (
                  <div key={item.url} className="relative group">
                    <Link
                      href={item.url}
                      className="text-sm font-sans font-medium text-foreground/80 hover:text-heading no-underline transition-colors duration-200 flex items-center gap-1 py-4"
                    >
                      {getLabel(item.name)}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:rotate-180 transition-transform">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </Link>
                    <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px] max-h-[70vh] overflow-y-auto">
                      <div className="bg-background/95 backdrop-blur-md border border-muted/10 rounded-xl shadow-xl p-2 flex flex-col gap-1 animate-slide-down">
                        {booksList.map(b => (
                          <Link
                            key={b.slug}
                            href={`/books/${b.slug}`}
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg transition-colors no-underline whitespace-nowrap"
                          >
                            {b.name}
                          </Link>
                        ))}
                        <div className="h-px bg-muted/10 my-1"></div>
                        <Link
                          href="/books"
                          className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-accent hover:bg-muted/5 rounded-lg transition-colors no-underline"
                        >
                          {t('all_books')} →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.name === 'Series' && seriesList.length > 0) {
                return (
                  <div key={item.url} className="relative group">
                    <Link
                      href={item.url}
                      className="text-sm font-sans font-medium text-foreground/80 hover:text-heading no-underline transition-colors duration-200 flex items-center gap-1 py-4"
                    >
                      {getLabel(item.name)}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:rotate-180 transition-transform">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </Link>
                    <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[200px] max-h-[70vh] overflow-y-auto">
                      <div className="bg-background/95 backdrop-blur-md border border-muted/10 rounded-xl shadow-xl p-2 flex flex-col gap-1 animate-slide-down">
                        {seriesList.map(s => (
                          <Link
                            key={s.slug}
                            href={`/series/${s.slug}`}
                            className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg transition-colors no-underline whitespace-nowrap"
                          >
                            {s.name}
                          </Link>
                        ))}
                        <div className="h-px bg-muted/10 my-1"></div>
                        <Link
                          href="/series"
                          className="block px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-accent hover:bg-muted/5 rounded-lg transition-colors no-underline"
                        >
                          {t('all_series')} →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Component
                  key={item.url}
                  href={item.url}
                  {...props}
                  className="text-sm font-sans font-medium text-foreground/80 hover:text-heading no-underline transition-colors duration-200 flex items-center gap-1"
                >
                  {getLabel(item.name)}
                  {isExternal && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-70"
                    >
                      <path d="M7 17l9.2-9.2M17 17V7H7" />
                    </svg>
                  )}
                </Component>
              );
            })}
          </div>
          <div className="w-px h-4 bg-muted/20 mx-1 hidden md:block"></div>
          {/* Hamburger button - mobile only */}
          <button
            className="md:hidden p-2 -mr-2 text-foreground/80 hover:text-heading transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          <Search />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          {/* Menu */}
          <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-md border-b border-muted/10 shadow-lg animate-slide-down">
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const isExternal = !!('external' in item && item.external);
                const Component = isExternal ? 'a' : Link;
                const props = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

                return (
                  <Component
                    key={item.url}
                    href={item.url}
                    {...props}
                    className="flex items-center gap-2 px-3 py-3 text-base font-sans font-medium text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg no-underline transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {getLabel(item.name)}
                    {isExternal && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M7 17l9.2-9.2M17 17V7H7" />
                      </svg>
                    )}
                  </Component>
                );
              })}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
