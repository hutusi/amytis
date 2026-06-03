import { Suspense, type ReactNode } from 'react';
import { ImmersiveReadingProvider } from '@/components/ImmersiveReadingProvider';
import ImmersiveReadingFlagHandler from '@/components/ImmersiveReadingFlagHandler';

// Mirror of `src/app/[slug]/layout.tsx` for the default-path post URL
// (`/posts/<slug>`). Series posts can live under either URL pattern
// depending on the `series.autoPaths` setting in site.config.ts — having the
// provider mounted at both layout boundaries means immersive state persists
// across in-series navigation regardless of which pattern the user's site
// uses. Same Suspense isolation around the flag handler.
export default function PostsLayout({ children }: { children: ReactNode }) {
  return (
    <ImmersiveReadingProvider>
      <Suspense fallback={null}>
        <ImmersiveReadingFlagHandler />
      </Suspense>
      {children}
    </ImmersiveReadingProvider>
  );
}
