'use client';

import { useLanguage } from '@/components/LanguageProvider';
import LocaleLink from '@/components/LocaleLink';
import { useRenderedPathname } from '@/hooks/useRenderedPathname';
import { openSearch } from '@/lib/search-events';

const ACTION_CLASS =
  'inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm text-muted no-underline transition-colors hover:border-accent/40 hover:text-accent';

// Static export writes this as out/404.html — the page the host serves for
// any unknown URL, so it must stand on its own (branded, localized, ways
// forward) rather than the default unbranded Next.js 404. A dead end with
// only "home" loses readers who followed a stale link; search and the
// archive usually get them to what they were after.
//
// Because that one file answers /zh/… too, it stamps the pathname it was
// rendered for: useRenderedPathname() hydrates against the stamp, then
// re-renders in the URL's locale. The links stay in that locale where the
// target exists there.
export default function NotFound() {
  const { t } = useLanguage();
  const renderedPathname = useRenderedPathname();

  return (
    <div className="layout-main" data-rendered-pathname={renderedPathname ?? undefined}>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-mono text-7xl font-bold text-muted/30" aria-hidden="true">
          404
        </p>
        <h1 className="page-title mt-6">{t('not_found_title')}</h1>
        <p className="page-subtitle mt-2">{t('not_found_message')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={openSearch} className={ACTION_CLASS}>
            {t('search_the_site')}
          </button>
          <LocaleLink href="/archive" className={ACTION_CLASS}>
            {t('archive')}
          </LocaleLink>
          <LocaleLink href="/tags" className={ACTION_CLASS}>
            {t('tags')}
          </LocaleLink>
          <LocaleLink href="/" className={ACTION_CLASS}>
            {t('back_to_home')}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}
