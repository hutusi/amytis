'use client';

import { useState, useEffect } from 'react';

/**
 * Module-level subscriber set — only one DOM scroll listener exists
 * regardless of how many components call this hook.
 */
const listeners = new Set<(y: number) => void>();

function onScroll() {
  const y = window.scrollY;
  listeners.forEach(fn => fn(y));
}

/**
 * Returns the current window.scrollY, updating on every scroll event.
 * A single passive scroll listener is shared across all consumers.
 */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (listeners.size === 0) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    listeners.add(setScrollY);
    // Sync on mount via RAF to avoid cascading render error
    const rafId = requestAnimationFrame(() => setScrollY(window.scrollY));

    return () => {
      cancelAnimationFrame(rafId);
      listeners.delete(setScrollY);
      if (listeners.size === 0) {
        window.removeEventListener('scroll', onScroll);
      }
    };
  }, []);

  return scrollY;
}
