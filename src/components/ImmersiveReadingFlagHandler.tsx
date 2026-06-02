'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';

/**
 * Watches the URL for `?immersive=1` (set by the "Immersive reading" CTA on
 * the book index page) and, when present, enters the reader and strips the
 * flag so back-navigation doesn't loop it open.
 *
 * Lives in its own component so the `useSearchParams` bailout to client
 * rendering is contained — the Suspense boundary in the parent layout only
 * wraps this null-rendering handler, not the chapter content. Keeps the rest
 * of the book sub-tree statically prerenderable.
 *
 * No one-shot ref guard: router.replace strips the flag, which updates
 * useSearchParams reactively, which re-fires this effect with the flag gone
 * (early return). A subsequent explicit visit to another `?immersive=1` URL
 * in the same tab (e.g. browser back, or clicking the CTA again) re-triggers
 * the entry — a stale ref would silently swallow that.
 */
export default function ImmersiveReadingFlagHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { enter } = useImmersiveReading();

  useEffect(() => {
    if (searchParams?.get('immersive') !== '1') return;
    const activate = () => enter();
    activate();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('immersive');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, enter]);

  return null;
}
