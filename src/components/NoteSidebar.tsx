'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { BacklinkSource } from '@/lib/content/discovery';
import type { Heading } from '@/lib/content/types';
import { useLanguage } from './LanguageProvider';
import TocPanel from './TocPanel';
import MetaLabel from './ui/MetaLabel';

interface NoteSidebarProps {
  headings: Heading[];
  showToc: boolean;
  backlinks: BacklinkSource[];
  breadcrumb?: ReactNode;
}

export default function NoteSidebar({ headings, showToc, backlinks, breadcrumb }: NoteSidebarProps) {
  const { t } = useLanguage();

  return (
    <aside className="hidden lg:block sticky top-20 self-start w-[280px] max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 scrollbar-hide hover:scrollbar-thin">
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      {/* TOC */}
      {showToc && (
        <TocPanel
          headings={headings}
          className={`mb-6 ${backlinks.length > 0 ? 'pb-6 border-b border-ink/[0.05]' : ''}`}
        />
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div>
          <MetaLabel className="block mb-3">
            {t('backlinks')}
          </MetaLabel>
          <div className="flex flex-col gap-3">
            {backlinks.map(bl => (
              <div key={`${bl.type}-${bl.slug}`} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MetaLabel className="text-muted/60 border border-ink/[0.07] rounded px-1.5 py-0.5 shrink-0">
                    {bl.type}
                  </MetaLabel>
                  <Link
                    href={bl.url}
                    className="text-sm text-heading hover:text-accent no-underline transition-colors truncate"
                  >
                    {bl.title}
                  </Link>
                </div>
                {bl.context && (
                  <p className="text-xs text-muted leading-relaxed line-clamp-2 pl-0.5">
                    &ldquo;{bl.context}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
