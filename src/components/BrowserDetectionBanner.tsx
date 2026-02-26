'use client';

import { useState, useSyncExternalStore } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

const DISMISSED_KEY = 'browser-warning-dismissed';

function isOutdatedBrowser(): boolean {
  // Detect Internet Explorer
  if (/MSIE|Trident/.test(navigator.userAgent)) return true;

  // CSS custom properties (Chrome 49+, Firefox 31+, Safari 9.1+)
  if (!('CSS' in window) || !CSS.supports('color', 'var(--x)')) return true;

  // CSS cascade layers — required by Tailwind CSS v4 (Chrome 99+, Firefox 97+, Safari 15.4+)
  if (!CSS.supports('@layer test {}')) return true;

  // CSS oklch() — required by Tailwind CSS v4 color system (Chrome 111+, Firefox 113+, Safari 15.4+)
  if (!CSS.supports('color', 'oklch(0.5 0.1 0)')) return true;

  return false;
}

function subscribe() {
  return () => {};
}

function getSnapshot(): boolean {
  try {
    if (localStorage.getItem(DISMISSED_KEY)) return false;
  } catch {
    // localStorage unavailable (private browsing, sandboxed iframe, etc.)
    return false;
  }
  return isOutdatedBrowser();
}

function getServerSnapshot(): boolean {
  return false;
}

export default function BrowserDetectionBanner({ updateUrl }: { updateUrl?: string }) {
  const { t } = useLanguage();
  const isOutdated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);

  if (!isOutdated || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Ignore — dismissal works for current session via state
    }
    setDismissed(true);
  };

  return (
    <div
      role="alert"
      className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 px-4 py-2.5 flex items-center justify-center gap-3 text-sm"
    >
      <svg
        className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <span>{t('browser_outdated')}</span>
      {updateUrl && (
        <a
          href={updateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-medium hover:opacity-75 transition-opacity shrink-0"
        >
          {t('browser_update')}
        </a>
      )}
      <button
        onClick={dismiss}
        aria-label={t('browser_dismiss')}
        className="ml-auto p-1 rounded hover:opacity-70 transition-opacity focus-ring shrink-0"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M4.293 4.293a1 1 0 011.414 0L8 6.586l2.293-2.293a1 1 0 111.414 1.414L9.414 8l2.293 2.293a1 1 0 01-1.414 1.414L8 9.414l-2.293 2.293a1 1 0 01-1.414-1.414L6.586 8 4.293 5.707a1 1 0 010-1.414z" />
        </svg>
      </button>
    </div>
  );
}
