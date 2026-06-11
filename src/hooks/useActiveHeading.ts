'use client';

import { useState, useEffect } from 'react';
import type { Heading } from '@/lib/content/types';
import { getScrollableAncestor } from '@/lib/scroll-utils';

const ACTIVATION_LINE_PX = 100;

export function useActiveHeading(headings: Heading[], enabled = true): string {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (!enabled || headings.length === 0) return;

    const elements = headings
      .map(h => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    // In immersive reading mode the chapter scrolls inside the overlay's
    // <main>, not the window, so subscribe to whichever ancestor is doing
    // the scrolling. `getScrollableAncestor` returns null for normal pages.
    const container = getScrollableAncestor(elements[0]);
    const target: HTMLElement | Window = container ?? window;

    let rafId = 0;
    const compute = () => {
      const containerTop = container
        ? container.getBoundingClientRect().top
        : 0;
      let current = elements[0];
      for (const el of elements) {
        const top = el.getBoundingClientRect().top - containerTop;
        if (top <= ACTIVATION_LINE_PX) current = el;
        else break;
      }
      setActiveId(current.id);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(compute);
    };

    compute();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      target.removeEventListener('scroll', onScroll);
    };
  }, [enabled, headings]);

  return activeId;
}
