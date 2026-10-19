'use client';

import { useEffect } from 'react';

/**
 * Client-side-navigation fallback for RedirectPage: React never executes the
 * stub's inline script or meta refresh when it renders the page on the
 * client, so redirect from an effect instead (keeping the hash).
 */
export default function RedirectEffect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to + window.location.hash);
  }, [to]);
  return null;
}
