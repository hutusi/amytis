'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      setProgress(Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)));
    }
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
