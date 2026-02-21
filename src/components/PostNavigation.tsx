import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import { t } from '@/lib/i18n';

interface PostNavigationProps {
  prev: PostData | null;
  next: PostData | null;
}

export default function PostNavigation({ prev, next }: PostNavigationProps) {
  if (!prev && !next) return null;

  return (
    <nav
      className="mt-12 pt-12 border-t border-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-3"
      aria-label={t('post_navigation')}
    >
      {prev ? (
        <Link
          href={`/posts/${prev.slug}`}
          className="group flex flex-col gap-1.5 p-4 rounded-xl border border-muted/15 hover:border-accent/30 hover:bg-accent/5 transition-all no-underline"
        >
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('prev')}
          </span>
          <span className="text-sm font-serif font-semibold text-heading group-hover:text-accent transition-colors line-clamp-2 leading-snug">
            {prev.title}
          </span>
          <span className="text-xs font-mono text-muted/60">{prev.date}</span>
        </Link>
      ) : <div />}

      {next ? (
        <Link
          href={`/posts/${next.slug}`}
          className="group flex flex-col gap-1.5 p-4 rounded-xl border border-muted/15 hover:border-accent/30 hover:bg-accent/5 transition-all no-underline sm:items-end sm:text-right"
        >
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
            {t('next')}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <span className="text-sm font-serif font-semibold text-heading group-hover:text-accent transition-colors line-clamp-2 leading-snug">
            {next.title}
          </span>
          <span className="text-xs font-mono text-muted/60">{next.date}</span>
        </Link>
      ) : <div />}
    </nav>
  );
}
