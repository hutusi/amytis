'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

export default function FlowHubTabs() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Normalize: strip trailing slash added by next.config trailingSlash:true
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  const isFlowsActive = path === '/flows' || path.startsWith('/flows/page');
  const isNotesActive = path === '/notes' || path.startsWith('/notes/page');
  const isGraphActive = path.startsWith('/graph');

  const tabs = [
    { href: '/flows', label: t('tab_daily_flow'), active: isFlowsActive },
    { href: '/notes', label: t('notes'), active: isNotesActive },
    { href: '/graph', label: t('tab_graph'), active: isGraphActive },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-muted/10 mb-8">
      {tabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2.5 text-sm font-medium no-underline transition-colors border-b-2 -mb-px ${
            tab.active
              ? 'border-accent text-accent'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
