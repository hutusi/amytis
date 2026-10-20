import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

/** Stamped by the not-found page with the pathname its HTML was rendered for. */
export const RENDERED_PATHNAME_ATTR = 'data-rendered-pathname';

const subscribe = () => () => {};

function readStampedPathname(): string | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(`[${RENDERED_PATHNAME_ATTR}]`)?.getAttribute(RENDERED_PATHNAME_ATTR) ?? null;
}

/**
 * `usePathname()`, except while hydrating HTML that was rendered for a
 * different URL.
 *
 * Static hosts serve the one exported 404.html for every unknown URL, so its
 * HTML was rendered at /_not-found (default locale, no nav item active) even
 * when the reader asked for /zh/…. Deriving output from the real pathname on
 * the first client render mismatches that HTML (React #418) and React throws
 * the whole page away. While hydrating, this returns the pathname the 404
 * page stamped, so the first client render matches; React then re-renders
 * with the real pathname (useSyncExternalStore swaps the server snapshot for
 * the client one after hydration). Every other page is served at the path it
 * was rendered for and carries no stamp, so this is plain usePathname().
 *
 * Use it for anything rendered from the pathname; event handlers and effects
 * can keep usePathname().
 */
export function useRenderedPathname(): string | null {
  const pathname = usePathname();
  return useSyncExternalStore(
    subscribe,
    () => pathname,
    () => readStampedPathname() ?? pathname,
  );
}
