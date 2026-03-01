'use client';

import { Fragment, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '../../site.config';
import type { NavChildItem } from '../../site.config';
import ThemeToggle from './ThemeToggle';
import LanguageSwitch from './LanguageSwitch';
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

// Map from nav URL to feature key
const FEATURE_URLS: Partial<Record<string, keyof typeof siteConfig.features>> = {
  '/posts': 'posts',
  '/flows': 'flow',
  '/notes': 'flow',
  '/graph': 'flow',
  '/series': 'series',
  '/books': 'books',
};

export default function Navbar({ seriesList = [], booksList = [] }: NavbarProps) {
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems = [...siteConfig.nav]
    .filter(item => {
      const featureKey = FEATURE_URLS[item.url];
      if (!featureKey) return true; // not a feature-gated item, always show
      return siteConfig.features?.[featureKey]?.enabled !== false;
    })
    .sort((a, b) => a.weight - b.weight);

  const getLabel = (name: string, url: string): string => {
    const featureKey = FEATURE_URLS[url];
    if (featureKey && siteConfig.features?.[featureKey]?.name) {
      return resolveLocaleValue(siteConfig.features[featureKey].name, language);
    }
    const key = name.toLowerCase() as TranslationKey;
    const translated = t(key);
    return translated !== key ? translated : name;
  };

  function isActive(url: string): boolean {
    if (url === '/flows') {
      return pathname.startsWith('/flows') || pathname.startsWith('/notes') || pathname.startsWith('/graph');
    }
    if (url === '/') return pathname === '/';
    return pathname.startsWith(url);
  }

  // Scroll-aware transparency
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll(); // sync with scroll position at mount (e.g. after refresh while scrolled)
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
    setOpenDropdown(null);
  }

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
    <nav className={`fixed top-0 left-0 w-full z-50 border-b transition-all duration-300 ${
      isScrolled
        ? 'border-muted/10 bg-background/90 backdrop-blur-md shadow-sm'
        : 'border-transparent bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-xl font-serif font-bold text-heading hover:text-accent transition-colors duration-200"
        >
          {siteConfig.logo?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={siteConfig.logo.src}
              alt=""
              className="h-8 w-auto"
            />
          ) : (
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
          )}
          <span>{resolveLocaleValue(siteConfig.title, language)}</span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isExternal = !!('external' in item && item.external);
              const Component = isExternal ? 'a' : Link;
              const props = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
              const active = isActive(item.url);

              if (item.url === '/books' && booksList.length > 0) {
                return (
                  <div key={item.url} className="relative group">
                    <Link
                      href={item.url}
                      className={`text-sm font-sans font-medium no-underline transition-colors duration-200 flex items-center gap-1 py-4 ${
                        active ? 'text-accent' : 'text-foreground/80 hover:text-heading'
                      }`}
                    >
                      {getLabel(item.name, item.url)}
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

              if (item.url === '/series' && seriesList.length > 0) {
                return (
                  <div key={item.url} className="relative group">
                    <Link
                      href={item.url}
                      className={`text-sm font-sans font-medium no-underline transition-colors duration-200 flex items-center gap-1 py-4 ${
                        active ? 'text-accent' : 'text-foreground/80 hover:text-heading'
                      }`}
                    >
                      {getLabel(item.name, item.url)}
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

              // Static children dropdown (e.g., "More")
              if (item.children && item.children.length > 0) {
                const childActive = item.children.some(c => c.url && pathname.startsWith(c.url));
                return (
                  <div key={item.url || item.name} className="relative group">
                    <button
                      type="button"
                      className={`text-sm font-sans font-medium transition-colors duration-200 flex items-center gap-1 py-4 bg-transparent border-0 cursor-pointer ${
                        childActive ? 'text-accent' : 'text-foreground/80 hover:text-heading'
                      }`}
                    >
                      {getLabel(item.name, item.url)}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:rotate-180 transition-transform">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[160px]">
                      <div className="bg-background/95 backdrop-blur-md border border-muted/10 rounded-xl shadow-xl p-2 flex flex-col gap-1 animate-slide-down">
                        {item.children.map((child: NavChildItem) => {
                          const ChildComp = child.external ? 'a' : Link;
                          const childProps = child.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
                          return (
                            <Fragment key={child.url}>
                              {child.dividerBefore && <div className="h-px bg-muted/10 my-1" />}
                              <ChildComp
                                href={child.url}
                                {...childProps}
                                className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg transition-colors no-underline whitespace-nowrap"
                              >
                                {getLabel(child.name, child.url)}
                              </ChildComp>
                            </Fragment>
                          );
                        })}
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
                  className={`text-sm font-sans font-medium no-underline transition-colors duration-200 flex items-center gap-1 ${
                    active ? 'text-accent' : 'text-foreground/80 hover:text-heading'
                  }`}
                >
                  {getLabel(item.name, item.url)}
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
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile menu panel */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-16 bg-background/60 backdrop-blur-sm md:hidden"
            onClick={() => closeMenu()}
          />
          {/* Menu */}
          <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-md border-b border-muted/10 shadow-lg animate-slide-down">
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const isExternal = !!('external' in item && item.external);
                const active = isActive(item.url);

                // Series accordion for mobile
                if (item.url === '/series' && seriesList.length > 0) {
                  const isOpen = openDropdown === '/series';
                  return (
                    <div key={item.url}>
                      <div className={`flex items-center rounded-lg transition-colors ${active ? 'text-accent' : 'text-foreground/80'}`}>
                        <Link
                          href={item.url}
                          className="flex-1 px-3 py-3 text-base font-sans font-medium no-underline hover:text-accent transition-colors"
                          onClick={() => closeMenu()}
                        >
                          {getLabel(item.name, item.url)}
                        </Link>
                        <button
                          className="px-3 py-3 text-foreground/60 hover:text-accent transition-colors"
                          onClick={() => setOpenDropdown(isOpen ? null : '/series')}
                          aria-label={isOpen ? 'Collapse series list' : 'Expand series list'}
                          aria-expanded={isOpen}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      </div>
                      {isOpen && (
                        <div className="ml-4 pl-3 border-l-2 border-muted/10 flex flex-col gap-1 mb-1">
                          {seriesList.map(s => (
                            <Link
                              key={s.slug}
                              href={`/series/${s.slug}`}
                              className="block px-3 py-2 text-sm text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg no-underline transition-colors"
                              onClick={() => closeMenu()}
                            >
                              {s.name}
                            </Link>
                          ))}
                          <Link
                            href="/series"
                            className="block px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-accent hover:bg-muted/5 rounded-lg no-underline transition-colors"
                            onClick={() => closeMenu()}
                          >
                            {t('all_series')} →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                // Books accordion for mobile
                if (item.url === '/books' && booksList.length > 0) {
                  const isOpen = openDropdown === '/books';
                  return (
                    <div key={item.url}>
                      <div className={`flex items-center rounded-lg transition-colors ${active ? 'text-accent' : 'text-foreground/80'}`}>
                        <Link
                          href={item.url}
                          className="flex-1 px-3 py-3 text-base font-sans font-medium no-underline hover:text-accent transition-colors"
                          onClick={() => closeMenu()}
                        >
                          {getLabel(item.name, item.url)}
                        </Link>
                        <button
                          className="px-3 py-3 text-foreground/60 hover:text-accent transition-colors"
                          onClick={() => setOpenDropdown(isOpen ? null : '/books')}
                          aria-label={isOpen ? 'Collapse books list' : 'Expand books list'}
                          aria-expanded={isOpen}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        </button>
                      </div>
                      {isOpen && (
                        <div className="ml-4 pl-3 border-l-2 border-muted/10 flex flex-col gap-1 mb-1">
                          {booksList.map(b => (
                            <Link
                              key={b.slug}
                              href={`/books/${b.slug}`}
                              className="block px-3 py-2 text-sm text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg no-underline transition-colors"
                              onClick={() => closeMenu()}
                            >
                              {b.name}
                            </Link>
                          ))}
                          <Link
                            href="/books"
                            className="block px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-accent hover:bg-muted/5 rounded-lg no-underline transition-colors"
                            onClick={() => closeMenu()}
                          >
                            {t('all_books')} →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }

                // Static children accordion for mobile (e.g., "More")
                if (item.children && item.children.length > 0) {
                  const dropdownKey = item.url || item.name;
                  const isOpen = openDropdown === dropdownKey;
                  const childActive = item.children.some(c => c.url && pathname.startsWith(c.url));
                  return (
                    <div key={dropdownKey}>
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between px-3 py-3 text-base font-sans font-medium rounded-lg transition-colors ${
                          childActive ? 'text-accent' : 'text-foreground/80 hover:text-accent hover:bg-muted/5'
                        }`}
                        onClick={() => setOpenDropdown(isOpen ? null : dropdownKey)}
                        aria-expanded={isOpen}
                      >
                        {getLabel(item.name, item.url)}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="ml-4 pl-3 border-l-2 border-muted/10 flex flex-col gap-1 mb-1">
                          {item.children.map((child: NavChildItem) => {
                            const ChildComp = child.external ? 'a' : Link;
                            const childProps = child.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
                            return (
                              <Fragment key={child.url}>
                                {child.dividerBefore && <div className="h-px bg-muted/10 my-1" />}
                                <ChildComp
                                  href={child.url}
                                  {...childProps}
                                  className="block px-3 py-2 text-sm text-foreground/80 hover:text-accent hover:bg-muted/5 rounded-lg no-underline transition-colors"
                                  onClick={() => closeMenu()}
                                >
                                  {getLabel(child.name, child.url)}
                                </ChildComp>
                              </Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular mobile nav item
                const Component = isExternal ? 'a' : Link;
                const props = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
                return (
                  <Component
                    key={item.url}
                    href={item.url}
                    {...props}
                    className={`flex items-center gap-2 px-3 py-3 text-base font-sans font-medium rounded-lg no-underline transition-colors ${
                      active ? 'text-accent' : 'text-foreground/80 hover:text-accent hover:bg-muted/5'
                    }`}
                    onClick={() => closeMenu()}
                  >
                    {getLabel(item.name, item.url)}
                    {isExternal && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M7 17l9.2-9.2M17 17V7H7" />
                      </svg>
                    )}
                  </Component>
                );
              })}
              <div className="mt-2 pt-3 border-t border-muted/10 px-3">
                <LanguageSwitch />
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
