'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

/**
 * Daily/Stream pill switcher shown below the page header on flow pages.
 * The two views render the same flows: /flows is the calendar/excerpt
 * view, /flows/stream the full-content reading view.
 */
export default function FlowViewSwitcher() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Normalize: strip trailing slash added by next.config trailingSlash:true
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const isStream = path === '/flows/stream' || path.startsWith('/flows/stream/page');

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full no-underline transition-colors ${
      active ? 'bg-accent/10 text-accent font-medium' : 'text-muted hover:text-heading'
    }`;

  return (
    <div className="mb-12 flex justify-center">
      <div
        role="group"
        aria-label={t('flow_view_mode')}
        className="flex items-center rounded-full border border-muted/20 p-0.5 text-xs"
      >
        <Link href="/flows" aria-current={!isStream ? 'page' : undefined} className={pillClass(!isStream)}>
          {t('flow_view_daily')}
        </Link>
        <Link href="/flows/stream" aria-current={isStream ? 'page' : undefined} className={pillClass(isStream)}>
          {t('flow_view_stream')}
        </Link>
      </div>
    </div>
  );
}
