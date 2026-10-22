import { clsx, type ClassValue } from 'clsx';

/**
 * Compose class names: clsx flattens conditionals/arrays/objects and drops
 * falsy values. Use everywhere classes are conditionally or compositionally
 * built instead of ad-hoc template strings.
 *
 * It does not resolve conflicting Tailwind utilities (tailwind-merge's 8.6KB
 * was the price of that on most pages). Tailwind v4 orders utilities by
 * property, so for `cn('p-2', 'p-4')` the stylesheet decides which wins, not
 * argument order. Don't pass two utilities for one property: add a variant
 * constant (see COVER_ZOOM_SLOW in ui-classes.ts) or choose one conditionally.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export type { ClassValue };
