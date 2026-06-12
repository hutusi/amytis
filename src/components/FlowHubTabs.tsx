'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

interface FlowHubTabsProps {
  subtitle?: string;
}

export default function FlowHubTabs({ subtitle }: FlowHubTabsProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Normalize: strip trailing slash added by next.config trailingSlash:true
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const isStreamActive = path === '/flows/stream' || path.startsWith('/flows/stream/page');
  const isFlowsActive = path === '/flows' || path.startsWith('/flows/page') || isStreamActive;
  const isNotesActive = path === '/notes' || path.startsWith('/notes/page');
  const isGraphActive = path.startsWith('/graph');

  const tabs = [
    { href: '/flows', label: t('tab_daily_flow'), active: isFlowsActive },
    { href: '/notes', label: t('notes'), active: isNotesActive },
    { href: '/graph', label: t('tab_graph'), active: isGraphActive },
  ];

  return (
    <div className="mb-10">
      <div className="flex items-end gap-8 border-b border-muted/20">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 text-3xl font-bold no-underline border-b-2 -mb-px transition-colors ${
              tab.active
                ? 'border-accent text-heading'
                : 'border-transparent text-muted/30 hover:text-muted/60'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {(subtitle || isFlowsActive) && (
        <div className="mt-3 flex items-center justify-between gap-4">
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : <span />}
          {isFlowsActive && (
            <div
              role="group"
              aria-label={t('flow_view_mode')}
              className="flex shrink-0 items-center rounded-full border border-muted/20 p-0.5 text-xs"
            >
              <Link
                href="/flows"
                aria-current={!isStreamActive ? 'page' : undefined}
                className={`px-3 py-1 rounded-full no-underline transition-colors ${
                  !isStreamActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted hover:text-heading'
                }`}
              >
                {t('flow_view_daily')}
              </Link>
              <Link
                href="/flows/stream"
                aria-current={isStreamActive ? 'page' : undefined}
                className={`px-3 py-1 rounded-full no-underline transition-colors ${
                  isStreamActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted hover:text-heading'
                }`}
              >
                {t('flow_view_stream')}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
