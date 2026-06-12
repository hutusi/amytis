'use client';

import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';
import { useLanguage } from '@/components/LanguageProvider';

export default function ImmersiveToggleButton() {
  const { enabled, toggle } = useImmersiveReading();
  const { t } = useLanguage();
  // The button is the "enter" affordance; in immersive mode the top bar's
  // exit (✕) is the only way out, so the inline button hides to avoid
  // duplicating the exit and reading "Exit reading mode" next to it. Owning
  // the visibility here means callers (PostLayout's article header, etc.)
  // don't need to gate it with `{!enabled && ...}` separately.
  if (enabled) return null;
  const label = t('immersive_reading');

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-sans text-muted hover:text-accent hover:bg-ink/[0.05] transition-colors border border-transparent hover:border-ink/[0.08] select-none"
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
