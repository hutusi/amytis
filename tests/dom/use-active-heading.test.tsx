import { describe, test, expect, spyOn } from 'bun:test';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useActiveHeading } from '@/hooks/useActiveHeading';
import type { Heading } from '@/lib/content/types';

function Probe({ headings, enabled = true }: { headings: Heading[]; enabled?: boolean }) {
  const active = useActiveHeading(headings, enabled);
  return <span data-testid="active">{active || '(none)'}</span>;
}

/** happy-dom has no layout engine, so each heading's viewport offset is stubbed. */
function stubRect(el: HTMLElement, top: number) {
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom: top + 24,
      left: 0,
      right: 100,
      width: 100,
      height: 24,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/** Appends stubbed heading elements to document.body; body is reset by the
 * global afterEach in setup.ts. */
function mountHeadingElements(tops: Record<string, number>): Record<string, HTMLElement> {
  const els: Record<string, HTMLElement> = {};
  for (const [id, top] of Object.entries(tops)) {
    const el = document.createElement('h2');
    el.id = id;
    el.textContent = id;
    document.body.appendChild(el);
    stubRect(el, top);
    els[id] = el;
  }
  return els;
}

const HEADINGS: Heading[] = [
  { id: 'intro', text: 'Intro', level: 2 },
  { id: 'usage', text: 'Usage', level: 2 },
  { id: 'faq', text: 'FAQ', level: 2 },
];

describe('useActiveHeading', () => {
  test('reports the last heading above the activation line on mount', () => {
    // Activation line is 100px: intro (-120) and usage (40) are above it,
    // faq (500) is below - so usage is active.
    mountHeadingElements({ intro: -120, usage: 40, faq: 500 });
    render(<Probe headings={HEADINGS} />);
    expect(screen.getByTestId('active').textContent).toBe('usage');
  });

  test('falls back to the first heading when none crossed the line', () => {
    mountHeadingElements({ intro: 200, usage: 400, faq: 600 });
    render(<Probe headings={HEADINGS} />);
    expect(screen.getByTestId('active').textContent).toBe('intro');
  });

  test('updates the active heading on scroll (through the real RAF)', async () => {
    const els = mountHeadingElements({ intro: -120, usage: 40, faq: 500 });
    render(<Probe headings={HEADINGS} />);
    expect(screen.getByTestId('active').textContent).toBe('usage');

    // Scroll down: faq moves above the activation line.
    stubRect(els.faq, 60);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('active').textContent).toBe('faq');
    });

    // Scroll back up: faq drops below the line again.
    stubRect(els.faq, 400);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('active').textContent).toBe('usage');
    });
  });

  test('throttles scroll handling to one pending animation frame', () => {
    // Manual RAF harness: queue callbacks instead of scheduling them, so the
    // test can observe how many frames survive a burst of scroll events.
    const rafQueue = new Map<number, FrameRequestCallback>();
    let nextRafId = 1;
    const rafSpy = spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
      ((cb: FrameRequestCallback) => {
        const id = nextRafId++;
        rafQueue.set(id, cb);
        return id;
      }) as typeof requestAnimationFrame,
    );
    const cafSpy = spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(
      ((id: number) => {
        rafQueue.delete(id);
      }) as typeof cancelAnimationFrame,
    );

    try {
      const els = mountHeadingElements({ intro: -120, usage: 40, faq: 500 });
      const view = render(<Probe headings={HEADINGS} />);
      // Initial compute is synchronous (not RAF-scheduled).
      expect(screen.getByTestId('active').textContent).toBe('usage');

      stubRect(els.faq, 60);
      act(() => {
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('scroll'));
      });

      // Three events scheduled three frames, but each cancelled its
      // predecessor - only the latest survives.
      expect(rafSpy.mock.calls.length).toBe(3);
      expect(rafQueue.size).toBe(1);

      // Nothing recomputed until the surviving frame is flushed.
      expect(screen.getByTestId('active').textContent).toBe('usage');
      act(() => {
        const callbacks = [...rafQueue.values()];
        rafQueue.clear();
        for (const cb of callbacks) cb(0);
      });
      expect(screen.getByTestId('active').textContent).toBe('faq');

      // Unmount while the stub is still installed so the effect cleanup's
      // cancelAnimationFrame hits the harness, not the real scheduler.
      view.unmount();
      expect(cafSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      rafSpy.mockRestore();
      cafSpy.mockRestore();
    }
  });

  test('stays inactive when disabled', () => {
    mountHeadingElements({ intro: -120, usage: 40 });
    render(<Probe headings={HEADINGS} enabled={false} />);
    expect(screen.getByTestId('active').textContent).toBe('(none)');
  });

  test('stays inactive when no heading elements exist in the DOM', () => {
    render(<Probe headings={HEADINGS} />);
    expect(screen.getByTestId('active').textContent).toBe('(none)');
  });
});
