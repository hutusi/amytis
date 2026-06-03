'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Scrolls the current sidebar item into view when `dep` changes.
 *
 * - **First run** (sidebar just mounted — e.g. the reader landed on a page
 *   mid-TOC): centres the current item so there's context above and below.
 * - **Subsequent runs** (the reader clicked another sidebar link to
 *   navigate): only scrolls if the new current item is out of view, and
 *   only enough to bring it on-screen. Crucially, if the target was
 *   already visible, the sidebar's scroll position does **not** change —
 *   clicking a chapter right in front of you no longer makes the sidebar
 *   jump.
 *
 * The previous implementation always hard-centred via `scrollTop = ...`
 * regardless of visibility, which on long book TOCs visibly snapped the
 * sidebar back toward the top whenever the new current chapter was in
 * the upper half. `scrollIntoView({ block: 'nearest' })` handles the
 * "skip if already visible" case natively. The `sidebarRef` first
 * parameter is kept for API stability (all callers still pass it); the
 * new implementation doesn't need it because `scrollIntoView` walks up
 * to the nearest scrollable ancestor on its own.
 */
export function useSidebarAutoScroll(
  _sidebarRef: RefObject<HTMLElement | null>,
  itemRef: RefObject<HTMLElement | null>,
  dep: unknown,
): void {
  const hasRunRef = useRef(false);
  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;
    item.scrollIntoView({
      block: hasRunRef.current ? 'nearest' : 'center',
      inline: 'nearest',
    });
    hasRunRef.current = true;
  // refs are stable; only re-run when dep changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
}
