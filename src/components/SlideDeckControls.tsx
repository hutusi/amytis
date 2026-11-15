'use client';

import { lazy, Suspense, useSyncExternalStore, type ComponentType } from 'react';
import type { SlideDeckRuntimeProps } from '@/components/SlideDeckRuntime';

function NoControls() {
  return null;
}

// The controls load on demand. MarkdownRenderer's client components share
// one chunk per route, so a static import would put the runtime on every
// article page, deck or not; this gate is all those pages carry. A failed
// download leaves the deck as the plain scroller it is without JavaScript.
const SlideDeckRuntime = lazy<ComponentType<SlideDeckRuntimeProps>>(() =>
  import('@/components/SlideDeckRuntime').catch(() => ({ default: NoControls })),
);

const subscribeNever = () => () => {};

/**
 * Mounts a slide deck's interactive layer (SlideDeckRuntime) after
 * hydration. The server renders nothing here, so readers without JavaScript
 * never see buttons that do nothing.
 */
export default function SlideDeckControls(props: SlideDeckRuntimeProps) {
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <SlideDeckRuntime {...props} />
    </Suspense>
  );
}
