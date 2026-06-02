'use client';

import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';
import { useLanguage } from '@/components/LanguageProvider';

export default function ImmersiveToggleButton() {
  const { enabled, toggle } = useImmersiveReading();
  const { t } = useLanguage();
  const label = enabled ? t('exit_reading_mode') : t('immersive_reading');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-sans text-muted hover:text-accent hover:bg-muted/10 transition-colors border border-transparent hover:border-muted/20 select-none"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M8 12h8" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
