import { describe, test, expect, spyOn } from 'bun:test';
import { render, screen, act, waitFor } from '@testing-library/react';
import { useScrollY } from '@/hooks/useScrollY';

function ScrollProbe({ id }: { id: string }) {
  const y = useScrollY();
  return <span data-testid={id}>{y}</span>;
}

/**
 * happy-dom's window.scrollTo updates window.scrollY but does NOT emit a
 * scroll event (verified against happy-dom 20.x), so tests control position
 * and event dispatch independently — exactly what the shared-listener
 * assertions need.
 */
function scrollWindowTo(y: number) {
  act(() => {
    window.scrollTo(0, y);
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('useScrollY', () => {
  test('starts at 0 and updates on scroll events', () => {
    render(<ScrollProbe id="a" />);
    expect(screen.getByTestId('a').textContent).toBe('0');

    scrollWindowTo(150);
    expect(screen.getByTestId('a').textContent).toBe('150');

    scrollWindowTo(0);
    expect(screen.getByTestId('a').textContent).toBe('0');
  });

  test('syncs to the current scroll position on mount (RAF sync)', async () => {
    window.scrollTo(0, 80);
    render(<ScrollProbe id="a" />);

    // State starts at 0; the mount RAF syncs it to the real position.
    await waitFor(() => {
      expect(screen.getByTestId('a').textContent).toBe('80');
    });
  });

  test('shares one window listener across consumers with refcounted teardown', async () => {
    const addSpy = spyOn(window, 'addEventListener');
    const removeSpy = spyOn(window, 'removeEventListener');
    const scrollAdds = () => addSpy.mock.calls.filter(call => call[0] === 'scroll').length;
    const scrollRemoves = () => removeSpy.mock.calls.filter(call => call[0] === 'scroll').length;

    try {
      // Two independent roots so they can unmount separately.
      const first = render(<ScrollProbe id="a" />);
      const second = render(<ScrollProbe id="b" />);

      // Both consumers share a single DOM listener.
      expect(scrollAdds()).toBe(1);

      scrollWindowTo(120);
      expect(screen.getByTestId('a').textContent).toBe('120');
      expect(screen.getByTestId('b').textContent).toBe('120');

      // Unmounting one consumer keeps the shared listener alive.
      first.unmount();
      expect(scrollRemoves()).toBe(0);

      scrollWindowTo(220);
      expect(screen.getByTestId('b').textContent).toBe('220');

      // Unmounting the last consumer removes the listener exactly once.
      second.unmount();
      expect(scrollRemoves()).toBe(1);
      expect(scrollAdds()).toBe(1);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  test('a consumer mounted after others still receives updates', async () => {
    const first = render(<ScrollProbe id="a" />);
    const second = render(<ScrollProbe id="b" />);

    scrollWindowTo(45);
    expect(screen.getByTestId('a').textContent).toBe('45');
    expect(screen.getByTestId('b').textContent).toBe('45');

    first.unmount();
    second.unmount();

    // Refcount dropped to zero and back up: a fresh consumer re-registers.
    render(<ScrollProbe id="c" />);
    scrollWindowTo(300);
    expect(screen.getByTestId('c').textContent).toBe('300');
  });
});
