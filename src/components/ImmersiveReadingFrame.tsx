'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useImmersiveReading, type ReadingColumnWidth, type ReadingFontSize } from '@/components/ImmersiveReadingProvider';

const FONT_SIZE_REM: Record<ReadingFontSize, string> = {
  s: '1rem',
  m: '1.125rem',
  l: '1.25rem',
  xl: '1.5rem',
};

const COLUMN_WIDTH_CLASS: Record<ReadingColumnWidth, string> = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-4xl',
};

export default function ImmersiveReadingFrame({ children }: { children: ReactNode }) {
  const { enabled, fontSize, readingTheme, columnWidth } = useImmersiveReading();

  if (!enabled) {
    // When disabled, render children plain — no extra wrapper, no styling.
    return <>{children}</>;
  }

  const style: CSSProperties = {
    ['--reading-font-size' as keyof CSSProperties]: FONT_SIZE_REM[fontSize],
  } as CSSProperties;

  return (
    <div
      data-reading-frame
      data-reading-theme={readingTheme}
      className={`${COLUMN_WIDTH_CLASS[columnWidth]} mx-auto`}
      style={style}
    >
      {children}
    </div>
  );
}
