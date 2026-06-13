import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeadingProps {
  children: ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * The serif content-section heading used by the home-page sections
 * (featured, latest writing, recent notes, selected books, curated series).
 * Centralizes the repeated
 * `text-2xl sm:text-3xl font-serif font-bold text-heading` heading style.
 */
export default function SectionHeading({
  children,
  as: Component = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <Component className={cn('text-2xl sm:text-3xl font-serif font-bold text-heading', className)}>
      {children}
    </Component>
  );
}
