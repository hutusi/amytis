'use client';

import Link from 'next/link';
import { siteConfig } from '../../site.config';
import ThemeToggle from './ThemeToggle';
import Search from '@/components/Search';
import { useLanguage } from '@/components/LanguageProvider';

/**
 * Global navigation bar.
 * Features:
 * - Fixed position with backdrop blur.
 * - Configuration-driven menu items (from site.config.ts).
 * - Supports internal routes and external links (with icons).
 * - Integrated ThemeToggle and LanguageSwitch.
 */
export default function Navbar() {
  const { t } = useLanguage();
  const navItems = [...siteConfig.nav].sort((a, b) => a.weight - b.weight);

  const getLabel = (name: string): string => {
    const key = name.toLowerCase() as any;
    // Check if translation exists, otherwise return original
    // This assumes translation keys match the lowercase English names
    const translated = t(key);
    return translated !== key ? translated : name;
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b border-muted/10 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
          >
            <path d="M16 4 L7 28" />
            <path d="M16 4 L25 28" />
            <path d="M11.5 18 H 20.5" />
            <path d="M20.5 18 Q 26 14 26 8 Q 23 12 20.5 18" fill="currentColor" stroke="none" />
          </svg>
          <span>{siteConfig.title}</span>
        </Link>
        
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isExternal = !!('external' in item && item.external);
              const Component = isExternal ? 'a' : Link;
              const props = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

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
          <Search />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
