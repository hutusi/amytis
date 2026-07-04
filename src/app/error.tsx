'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

// Client-side error boundary for the whole route tree. The site is a static
// export, so this only catches errors thrown in client components at runtime
// (hydration, event handlers) — but without it users got a blank screen.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="layout-main">
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="page-title">{t('error_title')}</h1>
        <p className="page-subtitle mt-2">{t('error_message')}</p>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            {t('try_again')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm text-muted no-underline transition-colors hover:border-accent/40 hover:text-accent"
          >
            {t('back_to_home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
