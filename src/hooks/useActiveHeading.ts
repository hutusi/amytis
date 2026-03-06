'use client';

import { useState, useEffect } from 'react';
import type { Heading } from '@/lib/markdown';
import { useScrollY } from './useScrollY';

export function useActiveHeading(headings: Heading[], enabled = true): string {
  const [activeId, setActiveId] = useState('');
  const scrollY = useScrollY();

  useEffect(() => {
    if (!enabled || headings.length === 0) return;

    const elements = headings
      .map(h => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const scrollPosition = scrollY + 100;
    let current = elements[0];
    for (const el of elements) {
      if (el.offsetTop <= scrollPosition) current = el;
      else break;
    }

    const rafId = requestAnimationFrame(() => { if (current) setActiveId(current.id); });
    return () => cancelAnimationFrame(rafId);
  }, [scrollY, headings, enabled]);

  return activeId;
}
