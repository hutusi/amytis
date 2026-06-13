import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type MetaLabelTone = 'muted' | 'accent';

interface MetaLabelProps {
  children: ReactNode;
  tone?: MetaLabelTone;
  as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'h4';
  className?: string;
}

const TONE_CLASS: Record<MetaLabelTone, string> = {
  muted: 'text-muted',
  accent: 'text-accent',
};

/**
 * The small uppercase "eyebrow" / meta label used across sidebars, cards, and
 * section headers. Centralizes the repeated
 * `text-[10px] font-sans font-bold uppercase tracking-widest` micro-label
 * styling that was hand-rolled in 15+ places. Polymorphic via `as`; extra
 * classes (margins, flex, hover) compose through `className`.
 */
export default function MetaLabel({
  children,
  tone = 'muted',
  as: Component = 'span',
  className,
}: MetaLabelProps) {
  return (
    <Component
      className={cn(
        'text-[10px] font-sans font-bold uppercase tracking-widest',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </Component>
  );
}
