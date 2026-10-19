'use client';

import { useEffect, useRef } from 'react';

/**
 * Thin progress bar under the navbar. Scroll handling bypasses React state:
 * one passive listener schedules at most one rAF per frame, which writes
 * `transform: scaleX()` straight to the bar (compositor-only — no React
 * re-render per scroll event, no layout-property animation). The track
 * stays mounted and fades in once reading starts.
 *
 * Keep `data-reading-progress`: the immersive-reading CSS hides the bar by
 * that attribute.
 */
export default function ReadingProgressBar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      if (trackRef.current) trackRef.current.style.opacity = progress > 0 ? '1' : '0';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      data-reading-progress
      aria-hidden="true"
      className="pointer-events-none fixed top-16 left-0 z-50 h-0.5 w-full bg-surface-soft opacity-0 transition-opacity duration-200"
    >
      <div ref={barRef} className="h-full origin-left bg-accent/70" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}
