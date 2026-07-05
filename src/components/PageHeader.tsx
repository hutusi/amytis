import { T } from './T';
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

// Server component: key selection is pure logic; the language-reactive
// rendering lives in the <T> client leaves.
export default function PageHeader({
  titleKey,
  titleParams,
  subtitleKey,
  subtitleOneKey,
  subtitleParams,
  count,
  className,
}: PageHeaderProps) {
  const effectiveSubtitleKey = subtitleOneKey && count === 1 ? subtitleOneKey : subtitleKey;

  return (
    <header className={`page-header ${className || ''}`}>
      <h1 className="page-title"><T k={titleKey} params={titleParams} /></h1>
      <p className="page-subtitle"><T k={effectiveSubtitleKey} params={subtitleParams} /></p>
    </header>
  );
}
