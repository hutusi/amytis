'use client';

import { useLanguage } from './LanguageProvider';
import { TranslationKey } from '@/i18n/translations';

interface PageHeaderProps {
  titleKey: TranslationKey;
  titleParams?: Record<string, string | number>;
  subtitleKey: TranslationKey;
  subtitleOneKey?: TranslationKey;
  subtitleParams?: Record<string, string | number>;
  count?: number;
  className?: string;
}

export default function PageHeader({
  titleKey,
  titleParams,
  subtitleKey,
  subtitleOneKey,
  subtitleParams,
  count,
  className,
}: PageHeaderProps) {
  const { t, tWith } = useLanguage();

  const title = titleParams ? tWith(titleKey, titleParams) : t(titleKey);
  const effectiveKey = subtitleOneKey && count === 1 ? subtitleOneKey : subtitleKey;
  const subtitle = subtitleParams
    ? tWith(effectiveKey, subtitleParams)
    : t(effectiveKey);

  return (
    <header className={`page-header ${className || ''}`}>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">{subtitle}</p>
    </header>
  );
}
