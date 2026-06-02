import { Suspense, type ReactNode } from 'react';
import { ImmersiveReadingProvider } from '@/components/ImmersiveReadingProvider';
import ImmersiveReadingFlagHandler from '@/components/ImmersiveReadingFlagHandler';

// Mounts the immersive-reading state above the chapter route. This is what
// lets immersive mode persist across client-side navigation between chapters
// of the same book (state would otherwise reset on every chapter unmount).
// State is in-memory only — a hard refresh or navigating to a different book
// resets it.
//
// The flag handler reads `?immersive=1` from the URL (set by the CTA on the
// book index page) and enters the reader. It's wrapped in <Suspense> on its
// own so its `useSearchParams` bailout doesn't drag {children} (the chapter
// page) out of static prerender.
export default function BookSlugLayout({ children }: { children: ReactNode }) {
  return (
    <ImmersiveReadingProvider>
      <Suspense fallback={null}>
        <ImmersiveReadingFlagHandler />
      </Suspense>
      {children}
    </ImmersiveReadingProvider>
  );
}
