'use client';

import { useScrollY } from '@/hooks/useScrollY';

export default function ReadingProgressBar() {
  const scrollY = useScrollY();
  const docHeight = typeof document !== 'undefined'
    ? document.documentElement.scrollHeight - window.innerHeight
    : 0;
  const progress = docHeight > 0 ? Math.min(100, Math.max(0, (scrollY / docHeight) * 100)) : 0;

  if (progress <= 0) return null;

  return (
    <div className="fixed top-16 left-0 w-full h-0.5 z-50 bg-muted/10">
      <div
        className="h-full bg-accent/70 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
