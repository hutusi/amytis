import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { metaLabel } from '@/lib/ui-classes';

interface MetaLabelProps {
  children: ReactNode;
  tone?: 'muted' | 'accent';
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'h4';
  className?: string;
  /**
   * Forwarded to the rendered element. Load-bearing on locale-bound labels
   * (sidebars / post nav) where SSR renders the default locale but the
   * `useLanguage()` hook serves the user's saved locale on hydration — see the
   * static-export + client-i18n drift note in TocPanel / PostSidebar.
   */
  suppressHydrationWarning?: boolean;
}

/**
 * The small uppercase "eyebrow" / meta label used across sidebars, cards, and
 * section headers. Centralizes the repeated uppercase micro-label styling that
 * was hand-rolled in 15+ places. Polymorphic via `as`; extra classes (margins,
 * flex, hover) compose through `className`. The class string itself lives in
 * `metaLabel()` (ui-classes.ts) — the single source of truth.
 */
export default function MetaLabel({
  children,
  tone = 'muted',
  as: Component = 'span',
  className,
  suppressHydrationWarning,
}: MetaLabelProps) {
  return (
    <Component className={cn(metaLabel(tone), className)} suppressHydrationWarning={suppressHydrationWarning}>
      {children}
    </Component>
  );
}
