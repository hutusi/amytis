'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

interface NavItem {
  href: string;
  title: string;
}

interface PrevNextNavProps {
  prev: NavItem | null;
  next: NavItem | null;
  size?: 'sm' | 'lg';
}

export default function PrevNextNav({ prev, next, size = 'sm' }: PrevNextNavProps) {
  const { t } = useLanguage();
  const isLg = size === 'lg';
  const padding = isLg ? 'py-4 px-5' : 'py-2.5 px-3';
  const rounding = isLg ? 'rounded-xl' : 'rounded-lg';
  const iconSize = isLg ? 'w-5 h-5' : 'w-4 h-4';
  const gap = isLg ? 'gap-3' : 'gap-2';
  const titleClass = isLg ? 'text-sm font-medium text-foreground/80 group-hover:text-foreground truncate transition-colors' : 'text-sm text-foreground/80 group-hover:text-foreground truncate transition-colors';
  const labelMargin = isLg ? 'mb-1' : 'mb-0.5';

  return (
    <div className={`flex ${isLg ? 'gap-4' : 'gap-3'}`}>
      {prev ? (
        <Link
          href={prev.href}
          className={`flex-1 flex items-center ${gap} ${padding} ${rounding} bg-muted/5 hover:bg-muted/10 no-underline transition-colors group`}
        >
          <svg className={`${iconSize} flex-shrink-0 text-muted group-hover:text-accent transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <div className="min-w-0">
            <span className={`block text-[10px] font-sans font-bold uppercase tracking-widest text-muted ${labelMargin}`}>{t('prev')}</span>
            <span className={`block ${titleClass}`}>{prev.title}</span>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <Link
          href={next.href}
          className={`flex-1 flex items-center justify-end ${gap} ${padding} ${rounding} bg-muted/5 hover:bg-muted/10 no-underline transition-colors group text-right`}
        >
          <div className="min-w-0">
            <span className={`block text-[10px] font-sans font-bold uppercase tracking-widest text-muted ${labelMargin}`}>{t('next')}</span>
            <span className={`block ${titleClass}`}>{next.title}</span>
          </div>
          <svg className={`${iconSize} flex-shrink-0 text-muted group-hover:text-accent transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
