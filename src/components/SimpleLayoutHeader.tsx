'use client';

import { useLanguage } from './LanguageProvider';
import { TranslationKey } from '@/i18n/translations';

interface SimpleLayoutHeaderProps {
  title: string;
  excerpt?: string;
  titleKey?: TranslationKey;
  subtitleKey?: TranslationKey;
}

export default function SimpleLayoutHeader({ title, excerpt, titleKey, subtitleKey }: SimpleLayoutHeaderProps) {
  const { t } = useLanguage();

  const displayTitle = titleKey ? t(titleKey) : title;
  const displaySubtitle = subtitleKey ? t(subtitleKey) : excerpt;

  return (
    <header className="page-header">
      <h1 className="page-title">{displayTitle}</h1>
      {displaySubtitle && (
        <p className="page-subtitle">{displaySubtitle}</p>
      )}
    </header>
  );
}
