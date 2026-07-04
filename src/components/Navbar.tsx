'use client';

import { useState, useEffect } from 'react';
import { featureLabelKey, visibleNavItems } from '@/lib/nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '../../site.config';
import type { NavChildItem } from '../../site.config';
import ThemeToggle from './ThemeToggle';
import LanguageSwitch from './LanguageSwitch';
import Search from '@/components/Search';
import NavDropdown, { type NavMenuItem } from './NavDropdown';
import NavAccordion from './NavAccordion';
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
  const { t, tWith, language } = useLanguage();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems = visibleNavItems(siteConfig.nav);

  const getLabel = (name: string, url: string): string => {
    const featureKey = featureLabelKey(url);
    if (featureKey && siteConfig.features?.[featureKey]?.name) {
      return resolveLocaleValue(siteConfig.features[featureKey].name, language);
    }
    const key = name.toLowerCase() as TranslationKey;
    const translated = t(key);
    return translated !== key ? translated : name;
  };

  function isActive(url: string): boolean {
    if (!url) return false;
    if (url === '/') return pathname === '/';
    // Segment-aware prefix match: '/posts' must not claim '/posts-archive'.
    return pathname === url || pathname.startsWith(url + '/');
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

  const seriesItems: NavMenuItem[] = seriesList.map((s) => ({
    key: s.slug,
    href: `/series/${s.slug}`,
    label: s.name,
  }));
  const booksItems: NavMenuItem[] = booksList.map((b) => ({
    key: b.slug,
    href: `/books/${b.slug}`,
    label: b.name,
  }));
  const childItems = (children: NavChildItem[]): NavMenuItem[] =>
    children.map((child) => ({
      key: child.url,
      href: child.url,
      label: getLabel(child.name, child.url),
      external: child.external,
      dividerBefore: child.dividerBefore,
    }));

  const submenuLabels = (label: string) => ({
    expandLabel: tWith('nav_expand_submenu', { name: label }),
    collapseLabel: tWith('nav_collapse_submenu', { name: label }),
  });

  return (
    <nav
      data-site-nav
      className={`fixed top-0 left-0 w-full z-50 border-b transition-all duration-300 select-none ${
      isScrolled
        ? 'border-line bg-background/90 backdrop-blur-md shadow-sm'
        : 'border-transparent bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          onClick={pathname === '/' ? (e) => { if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); } } : undefined}
          className="flex items-center gap-3 min-w-0 text-xl font-serif font-bold text-heading hover:text-accent transition-colors duration-200"
        >
          {siteConfig.logo?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={siteConfig.logo.src}
              alt=""
              className="h-8 w-auto shrink-0"
            />
          ) : (
            <svg
              viewBox="0 0 32 32"
              className="w-8 h-8 shrink-0 text-accent"
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
          <span className="truncate">{resolveLocaleValue(siteConfig.title, language)}</span>
        </Link>

        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <div className="hidden md:flex items-center gap-6" data-testid="desktop-nav">
            {navItems.map((item) => {
              const isExternal = !!('external' in item && item.external);
              const Component = isExternal ? 'a' : Link;
              const props = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
              const active = isActive(item.url);
              const label = getLabel(item.name, item.url);

              if (item.url === '/books' && booksList.length > 0) {
                return (
                  <NavDropdown
                    key={item.url}
                    label={label}
                    href={item.url}
                    active={active}
                    items={booksItems}
                    footer={{ href: '/books', label: `${t('all_books')} →` }}
                    panelClassName="min-w-[200px] max-h-[70vh] overflow-y-auto"
                    {...submenuLabels(label)}
                  />
                );
              }

              if (item.url === '/series' && seriesList.length > 0) {
                return (
                  <NavDropdown
                    key={item.url}
                    label={label}
                    href={item.url}
                    active={active}
                    items={seriesItems}
                    footer={{ href: '/series', label: `${t('all_series')} →` }}
                    panelClassName="min-w-[200px] max-h-[70vh] overflow-y-auto"
                    {...submenuLabels(label)}
                  />
                );
              }

              // Static children dropdown (e.g., "More")
              if (item.children && item.children.length > 0) {
                const childActive = item.children.some(c => isActive(c.url));
                return (
                  <NavDropdown
                    key={item.url || item.name}
                    label={label}
                    active={childActive}
                    items={childItems(item.children)}
                    align="right"
                    panelClassName="min-w-[160px]"
                    {...submenuLabels(label)}
                  />
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
                  {label}
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
          <div className="w-px h-4 bg-surface-raised mx-1 hidden md:block"></div>
          {/* Hamburger button - mobile only */}
          <button
            className="md:hidden p-3 -mr-3 text-foreground/80 hover:text-heading transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? t('nav_close_menu') : t('nav_open_menu')}
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
          <span className="hidden sm:block"><LanguageSwitch /></span>
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
          <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-md border-b border-line shadow-lg animate-slide-down" data-testid="mobile-nav-panel">
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const isExternal = !!('external' in item && item.external);
                const active = isActive(item.url);
                const label = getLabel(item.name, item.url);

                if (item.url === '/series' && seriesList.length > 0) {
                  return (
                    <NavAccordion
                      key={item.url}
                      label={label}
                      href={item.url}
                      active={active}
                      items={seriesItems}
                      footer={{ href: '/series', label: `${t('all_series')} →` }}
                      isOpen={openDropdown === '/series'}
                      onToggle={() => setOpenDropdown(openDropdown === '/series' ? null : '/series')}
                      onNavigate={closeMenu}
                      {...submenuLabels(label)}
                    />
                  );
                }

                if (item.url === '/books' && booksList.length > 0) {
                  return (
                    <NavAccordion
                      key={item.url}
                      label={label}
                      href={item.url}
                      active={active}
                      items={booksItems}
                      footer={{ href: '/books', label: `${t('all_books')} →` }}
                      isOpen={openDropdown === '/books'}
                      onToggle={() => setOpenDropdown(openDropdown === '/books' ? null : '/books')}
                      onNavigate={closeMenu}
                      {...submenuLabels(label)}
                    />
                  );
                }

                // Static children accordion for mobile (e.g., "More")
                if (item.children && item.children.length > 0) {
                  const dropdownKey = item.url || item.name;
                  const childActive = item.children.some(c => isActive(c.url));
                  return (
                    <NavAccordion
                      key={dropdownKey}
                      label={label}
                      active={childActive}
                      items={childItems(item.children)}
                      isOpen={openDropdown === dropdownKey}
                      onToggle={() => setOpenDropdown(openDropdown === dropdownKey ? null : dropdownKey)}
                      onNavigate={closeMenu}
                      {...submenuLabels(label)}
                    />
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
                      active ? 'text-accent' : 'text-foreground/80 hover:text-accent hover:bg-surface-soft'
                    }`}
                    onClick={() => closeMenu()}
                  >
                    {label}
                    {isExternal && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M7 17l9.2-9.2M17 17V7H7" />
                      </svg>
                    )}
                  </Component>
                );
              })}
              <div className="mt-2 pt-3 border-t border-line px-3">
                <LanguageSwitch />
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
