import { afterEach, describe, expect, test } from 'bun:test';
import { act, render } from '@testing-library/react';
import ReadingProgressBar from '@/components/ReadingProgressBar';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function setDocumentHeight(height: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: height });
}

afterEach(() => {
  setDocumentHeight(0);
  window.scrollTo(0, 0);
});

describe('ReadingProgressBar', () => {
  test('scales the bar to the scrolled fraction without re-rendering', async () => {
    setDocumentHeight(window.innerHeight + 2000);
    const { container } = render(<ReadingProgressBar />);
    const track = container.querySelector<HTMLElement>('[data-reading-progress]')!;
    const bar = track.firstElementChild as HTMLElement;

    await act(nextFrame);
    expect(bar.style.transform).toBe('scaleX(0)');
    expect(track.style.opacity).toBe('0');

    await act(async () => {
      window.scrollTo(0, 500);
      window.dispatchEvent(new Event('scroll'));
      await nextFrame();
    });
    expect(bar.style.transform).toBe('scaleX(0.25)');
    expect(track.style.opacity).toBe('1');
  });

  test('coalesces a burst of scroll events into one frame', async () => {
    setDocumentHeight(window.innerHeight + 1000);
    const { container } = render(<ReadingProgressBar />);
    const bar = container.querySelector<HTMLElement>('[data-reading-progress]')!.firstElementChild as HTMLElement;
    await act(async () => {
      for (const y of [100, 200, 300, 1000]) {
        window.scrollTo(0, y);
        window.dispatchEvent(new Event('scroll'));
      }
      await nextFrame();
    });
    expect(bar.style.transform).toBe('scaleX(1)');
  });

  test('keeps the immersive-reading hook attribute', () => {
    const { container } = render(<ReadingProgressBar />);
    expect(container.querySelector('[data-reading-progress]')).not.toBeNull();
  });
});
