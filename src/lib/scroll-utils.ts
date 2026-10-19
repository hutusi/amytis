import type React from 'react';

const HEADING_OFFSET_PX = 80;

/**
 * Scroll behavior that honors the OS "reduce motion" setting. The global CSS
 * reduced-motion rule turns off `scroll-behavior: smooth`, but a JS
 * `scrollTo({ behavior: 'smooth' })` overrides CSS, so script-driven scrolls
 * must ask too.
 */
export function scrollBehavior(): ScrollBehavior {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}

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
    container.scrollTo({ top, behavior: scrollBehavior() });
  } else {
    const top =
      element.getBoundingClientRect().top + window.scrollY - HEADING_OFFSET_PX;
    window.scrollTo({ top, behavior: scrollBehavior() });
  }
  history.pushState(null, '', `#${id}`);
  // Move focus with the view, as a native #hash jump does, so keyboard and
  // screen-reader users continue reading from the heading rather than from
  // the TOC link. preventScroll: the scroll above already positions it.
  if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
  element.focus({ preventScroll: true });
}
