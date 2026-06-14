'use client';

import { useLanguage } from './LanguageProvider';
import MetaDot from './ui/MetaDot';

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
          <MetaDot />
          <span>{bookCount} {t('books').toLowerCase()}</span>
        </>
      )}
      {seriesCount > 0 && (
        <>
          <MetaDot />
          <span>{seriesCount} {t('series').toLowerCase()}</span>
        </>
      )}
      <MetaDot />
      <span>{categoryCount} {t('categories').toLowerCase()}</span>
    </div>
  );
}
