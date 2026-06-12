'use client';

import { useLanguage } from './LanguageProvider';

interface AuthorStatsProps {
  postCount: number;
  seriesCount: number;
  categoryCount: number;
  bookCount?: number;
}

export default function AuthorStats({ postCount, seriesCount, categoryCount, bookCount = 0 }: AuthorStatsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center gap-4 text-sm text-muted font-mono">
      <span>{postCount} {t('posts').toLowerCase()}</span>
      {bookCount > 0 && (
        <>
          <span className="h-1 w-1 rounded-full bg-ink/[0.12]" />
          <span>{bookCount} {t('books').toLowerCase()}</span>
        </>
      )}
      {seriesCount > 0 && (
        <>
          <span className="h-1 w-1 rounded-full bg-ink/[0.12]" />
          <span>{seriesCount} {t('series').toLowerCase()}</span>
        </>
      )}
      <span className="h-1 w-1 rounded-full bg-ink/[0.12]" />
      <span>{categoryCount} {t('categories').toLowerCase()}</span>
    </div>
  );
}
