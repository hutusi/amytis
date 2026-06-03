import { Suspense, type ReactNode } from 'react';
import { ImmersiveReadingProvider } from '@/components/ImmersiveReadingProvider';
import ImmersiveReadingFlagHandler from '@/components/ImmersiveReadingFlagHandler';

// Mounts the immersive-reading state above the series-prefixed post route
// (`/<series-slug>/<post>` when series.autoPaths is enabled, which is the
// default). This is what lets immersive mode persist across client-side
// navigation between sibling posts in the same series — without it, the
// provider would remount on every post navigation and reader state would
// reset.
//
// Note this layout wraps ALL single-segment routes under `/`, not just series
// posts (also redirectFrom aliases, custom-path posts, etc.). The provider
// only activates when the toggle is clicked, and the toggle is gated on
// `post.series`, so non-series routes pay only the mount cost.
//
// The flag handler reads `?immersive=1` from the URL (set by the CTA on the
// series index page) and enters the reader. It's wrapped in <Suspense> on its
// own so its `useSearchParams` bailout doesn't drag {children} out of static
// prerender.
export default function SlugLayout({ children }: { children: ReactNode }) {
  return (
    <ImmersiveReadingProvider>
      <Suspense fallback={null}>
        <ImmersiveReadingFlagHandler />
      </Suspense>
      {children}
    </ImmersiveReadingProvider>
  );
}
