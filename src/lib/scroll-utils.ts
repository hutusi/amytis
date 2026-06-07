import type React from 'react';

const HEADING_OFFSET_PX = 80;

/**
 * Walks up from `el` looking for the closest ancestor that actually scrolls
 * vertically. Returns `null` if the document/window is the scroll container —
 * that's the normal-page case; immersive reading mode is the case where this
 * returns the overlay's `<main>` element. The `scrollHeight > clientHeight`
 * guard skips `overflow:auto` boxes that aren't currently overflowing (e.g.
 * the overlay's sidebar `<aside>` or the article wrapper).
 */
export function getScrollableAncestor(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(cur);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      cur.scrollHeight > cur.clientHeight
    ) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

export function scrollToHeading(
  e: React.MouseEvent<HTMLAnchorElement>,
  id: string,
): void {
  const element = document.getElementById(id);
  if (!element) return;
  e.preventDefault();

  const container = getScrollableAncestor(element);
  if (container) {
    const elRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const top =
      elRect.top - containerRect.top + container.scrollTop - HEADING_OFFSET_PX;
    container.scrollTo({ top, behavior: 'smooth' });
  } else {
    const top =
      element.getBoundingClientRect().top + window.scrollY - HEADING_OFFSET_PX;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  history.pushState(null, '', `#${id}`);
}
