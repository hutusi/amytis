import { afterEach, describe, expect, mock, test } from 'bun:test';
import type React from 'react';
import { scrollBehavior, scrollToHeading } from '@/lib/scroll-utils';

const originalMatchMedia = window.matchMedia;
const originalScrollTo = window.scrollTo;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  window.scrollTo = originalScrollTo;
  document.body.innerHTML = '';
});

function prefersReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

const fakeClick = () => ({ preventDefault() {} }) as unknown as React.MouseEvent<HTMLAnchorElement>;

describe('scroll-utils', () => {
  test('scrollBehavior honors prefers-reduced-motion', () => {
    prefersReducedMotion(true);
    expect(scrollBehavior()).toBe('auto');
    prefersReducedMotion(false);
    expect(scrollBehavior()).toBe('smooth');
  });

  test('scrollToHeading scrolls without animation under reduced motion and moves focus to the heading', () => {
    prefersReducedMotion(true);
    const scrollTo = mock(() => {});
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    document.body.innerHTML = '<h2 id="setup">Setup</h2>';

    scrollToHeading(fakeClick(), 'setup');

    const heading = document.getElementById('setup')!;
    expect((scrollTo.mock.calls[0] as unknown as [ScrollToOptions])[0].behavior).toBe('auto');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(heading);
  });
});
