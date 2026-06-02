import type { ReactNode } from 'react';
import { ImmersiveReadingProvider } from '@/components/ImmersiveReadingProvider';

// Mounts the immersive-reading state above the chapter route. This is what
// lets immersive mode persist across client-side navigation between chapters
// of the same book (state would otherwise reset on every chapter unmount).
// State is in-memory only — a hard refresh or navigating to a different book
// resets it.
export default function BookSlugLayout({ children }: { children: ReactNode }) {
  return <ImmersiveReadingProvider>{children}</ImmersiveReadingProvider>;
}
