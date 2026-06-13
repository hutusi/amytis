import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind class names: clsx flattens conditionals/arrays/objects and
 * drops falsy values, then tailwind-merge resolves conflicting utilities so the
 * last-wins (e.g. `cn('p-2', 'p-4')` → `'p-4'`). Use everywhere classes are
 * conditionally or compositionally built instead of ad-hoc template strings.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
