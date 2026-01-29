'use client';

import { useLanguage } from './LanguageProvider';

export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
      className="p-2 rounded-md hover:bg-muted/20 transition-colors text-sm font-medium"
      aria-label="Toggle Language"
    >
      {language === 'en' ? '中文' : 'EN'}
    </button>
  );
}
