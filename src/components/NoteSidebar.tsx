'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { BacklinkSource, Heading } from '@/lib/markdown';
import { useLanguage } from './LanguageProvider';
import TocPanel from './TocPanel';

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
          className={`mb-6 ${backlinks.length > 0 ? 'pb-6 border-b border-muted/10' : ''}`}
        />
      )}

      {/* Backlinks */}
      {backlinks.length > 0 && (
        <div>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted block mb-3">
            {t('backlinks')}
          </span>
          <div className="flex flex-col gap-3">
            {backlinks.map(bl => (
              <div key={`${bl.type}-${bl.slug}`} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted/60 border border-muted/20 rounded px-1.5 py-0.5 shrink-0">
                    {bl.type}
                  </span>
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
