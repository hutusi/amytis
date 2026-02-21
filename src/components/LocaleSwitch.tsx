'use client';

import { useLanguage } from './LanguageProvider';
import { useEffect, useRef, ReactNode } from 'react';

/**
 * Shows the [data-locale] child matching the active language, hiding all others.
 * Keeps MarkdownRenderer fully server-rendered — no fs/Node modules in client bundle.
 */
export default function LocaleSwitch({
  children,
}: {
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const elements = container.querySelectorAll<HTMLElement>('[data-locale]');
    let hasMatch = false;
    elements.forEach((el) => {
      if (el.dataset.locale === language) hasMatch = true;
    });
    const effectiveLang = hasMatch ? language : elements[0]?.dataset.locale;
    elements.forEach((el) => {
      el.style.display = el.dataset.locale === effectiveLang ? '' : 'none';
    });
  }, [language]);

  return <div ref={ref}>{children}</div>;
}
