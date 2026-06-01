'use client';

import { useLanguage } from './LanguageProvider';
import type { TranslationKey } from '@/i18n/translations';

interface ArticleMetaProps {
  /** Literal label (e.g. a post's `category` from frontmatter — never localized). */
  headerLabel?: string;
  /** Translation key resolved against the active locale (e.g. `'chapter'` for books). */
  headerKey?: TranslationKey;
  /** ISO date — emitted as a `<time>` with `data-pagefind-meta` so Pagefind picks it up. */
  date?: string;
  wordCount: number;
  readingMinutes: number;
  /** Optional Tailwind bottom margin override; layouts differ slightly. */
  className?: string;
}

/**
 * Client-side meta line shared by `PostLayout` and `BookLayout` so the
 * `t('words')` / `t('reading_time')` calls track the live locale rather
 * than `siteConfig.i18n.defaultLocale`. Server-side `t()` from `@/lib/i18n`
 * is locale-blind once SSR'd — that's the reason this lives in a client
 * component instead of inline JSX in the layouts.
 */
export default function ArticleMeta({
  headerLabel,
  headerKey,
  date,
  wordCount,
  readingMinutes,
  className = 'mb-6',
}: ArticleMetaProps) {
  const { t } = useLanguage();
  const header = headerKey ? t(headerKey) : headerLabel;

  return (
    <div className={`flex items-center gap-3 text-xs font-sans text-muted ${className}`}>
      {header && (
        <>
          <span className="uppercase tracking-widest font-semibold text-accent">
            {header}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted/30" />
        </>
      )}
      {date && (
        <>
          <time className="font-mono" data-pagefind-meta="date[content]">{date}</time>
          <span className="w-1 h-1 rounded-full bg-muted/30" />
        </>
      )}
      <span className="font-mono">
        {wordCount.toLocaleString()} {t('words')}
      </span>
      <span className="w-1 h-1 rounded-full bg-muted/30" />
      <span className="font-mono text-muted/70">
        {readingMinutes} {t('reading_time')}
      </span>
    </div>
  );
}
