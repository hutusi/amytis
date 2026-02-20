'use client';

import { useLanguage } from './LanguageProvider';
import { TranslationKey } from '@/i18n/translations';

interface SimpleLayoutHeaderProps {
  title: string;
  excerpt?: string;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
  contentLocales?: Record<string, { content: string; title?: string; excerpt?: string }>;
}

export default function SimpleLayoutHeader({ title, excerpt, titleKey, subtitleKey, contentLocales }: SimpleLayoutHeaderProps) {
  const { t, language } = useLanguage();

  const localeData = contentLocales?.[language];
  const displayTitle = localeData?.title ?? (titleKey ? t(titleKey) : title);
  const displaySubtitle = localeData?.excerpt ?? (subtitleKey ? t(subtitleKey) : excerpt);

  return (
    <header className="page-header">
      <h1 className="page-title">{displayTitle}</h1>
      {displaySubtitle && (
        <p className="page-subtitle">{displaySubtitle}</p>
      )}
    </header>
  );
}
