'use client';

import { useEffect } from 'react';
import { siteConfig } from '../../site.config';
import { translations, type Language } from '@/i18n/translations';
import { localeFromPathname, localizePath } from '@/lib/locale-urls';

/**
 * Last-resort boundary for errors thrown by the root layout's own client
 * components (Navbar, Search, Footer, the theme/language providers), which
 * route-level error.tsx cannot catch because it renders inside that layout.
 * Without it Next shows its unbranded "Application error" screen.
 *
 * It replaces the root layout, so it renders its own <html>/<body>, cannot
 * rely on the providers, and uses inline styles in the site's paper palette
 * (it must render even if the failure is in the styling pipeline). The
 * language comes from the URL prefix, like LanguageProvider's.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const i18nEnabled = siteConfig.i18n.enabled !== false && siteConfig.i18n.locales.length >= 2;
  const localeConfig = {
    locales: i18nEnabled ? siteConfig.i18n.locales : [],
    defaultLocale: siteConfig.i18n.defaultLocale,
  };
  const language = localeFromPathname(typeof window === 'undefined' ? null : window.location.pathname, localeConfig) as Language;
  const t = translations[language] ?? translations.en;

  const button = {
    border: '1px solid rgba(28, 25, 23, 0.15)',
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: '#44403c',
    font: 'inherit',
    fontSize: '0.875rem',
    textDecoration: 'none',
    cursor: 'pointer',
  } as const;

  return (
    <html lang={language}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafaf9',
          color: '#44403c',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <main>
          <h1 style={{ fontFamily: 'Georgia, serif', color: '#1c1917', fontSize: '2rem', margin: '0 0 0.5rem' }}>
            {t.error_title}
          </h1>
          <p style={{ margin: '0 0 2rem', color: '#57534e' }}>{t.error_message}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" onClick={reset} style={button}>
              {t.try_again}
            </button>
            {/* A full page load, not <Link>: the client router is what failed. */}
            <a href={localizePath('/', language, localeConfig)} style={button}>
              {t.back_to_home}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
