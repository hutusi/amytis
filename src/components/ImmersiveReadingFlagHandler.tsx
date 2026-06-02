'use client';

import { useEffect, useRef } from 'react';
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
 */
export default function ImmersiveReadingFlagHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { enter } = useImmersiveReading();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    if (searchParams?.get('immersive') !== '1') return;
    handledRef.current = true;
    const activate = () => enter();
    activate();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('immersive');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, enter]);

  return null;
}
