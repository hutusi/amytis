'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

// Static export writes this as out/404.html — the page the host serves for
// any unknown URL, so it must stand on its own (branded, localized, a way
// back home) rather than the default unbranded Next.js 404.
export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="layout-main">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-mono text-7xl font-bold text-muted/30" aria-hidden="true">
          404
        </p>
        <h1 className="page-title mt-6">{t('not_found_title')}</h1>
        <p className="page-subtitle mt-2">{t('not_found_message')}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm text-muted no-underline transition-colors hover:border-accent/40 hover:text-accent"
        >
          {t('back_to_home')}
        </Link>
      </div>
    </div>
  );
}
