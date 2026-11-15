import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SlideDeck from '@/components/SlideDeck';
import { LanguageProvider } from '@/components/LanguageProvider';

// happy-dom has no layout, fullscreen or working IntersectionObserver, and
// its <dialog> has no native Escape. The deck's track is stubbed to a fixed
// width with a scrollTo that scrolls instantly and fires scroll + scrollend;
// fullscreen is stubbed on the prototype; the observer is under test control.

const WIDTH = 800;

let observerCallback: IntersectionObserverCallback | null = null;
class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    observerCallback = cb;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
const originalIO = globalThis.IntersectionObserver;

let fullscreenElement: Element | null = null;
let requestedOn: Element | null = null;
const fireFullscreenChange = () => setTimeout(() => document.dispatchEvent(new Event('fullscreenchange')), 0);
function requestFullscreenStub(this: Element) {
  return enterFullscreen(this);
}
const enterFullscreen = (element: Element) => {
  requestedOn = element;
  fullscreenElement = element;
  fireFullscreenChange();
  return Promise.resolve();
};
const requestFullscreen = mock(requestFullscreenStub);
const exitFullscreen = mock(() => {
  fullscreenElement = null;
  fireFullscreenChange();
  return Promise.resolve();
});

beforeAll(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  (document as unknown as { exitFullscreen: unknown }).exitFullscreen = exitFullscreen;
  (HTMLElement.prototype as unknown as { requestFullscreen: unknown }).requestFullscreen = requestFullscreen;
});

afterAll(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalIO;
  delete (document as unknown as Record<string, unknown>).fullscreenEnabled;
  delete (document as unknown as Record<string, unknown>).fullscreenElement;
  delete (document as unknown as Record<string, unknown>).exitFullscreen;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).requestFullscreen;
});

beforeEach(() => {
  observerCallback = null;
  fullscreenElement = null;
  requestedOn = null;
  requestFullscreen.mockClear();
  exitFullscreen.mockClear();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

const SLIDES = ['Title', 'Agenda', 'Architecture', 'Thanks'];

/** Renders a 4-slide deck the way MarkdownRenderer does, and waits for its controls. */
async function renderDeck(hash = '') {
  window.history.replaceState(null, '', `/posts/talk/${hash}`);
  render(
    <LanguageProvider>
      <SlideDeck data-base="slides" data-count={String(SLIDES.length)} data-title="My Talk">
        {SLIDES.map((alt, i) => (
          <div key={alt} id={`slides-${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/posts/talk/slides/slide-0${i + 1}.png`} alt={alt} loading="lazy" data-slide={String(i + 1)} />
          </div>
        ))}
      </SlideDeck>
    </LanguageProvider>,
  );
  const track = document.querySelector<HTMLElement>('[data-slide-track]')!;
  let left = 0;
  Object.defineProperty(track, 'clientWidth', { configurable: true, get: () => WIDTH });
  Object.defineProperty(track, 'scrollLeft', { configurable: true, get: () => left, set: (value: number) => { left = value; } });
  const scrollTo = mock((options: ScrollToOptions) => {
    left = options.left ?? left;
    track.dispatchEvent(new Event('scroll'));
    track.dispatchEvent(new Event('scrollend'));
  });
  track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
  // The runtime is a lazy chunk: wait for it to mount.
  await screen.findByRole('button', { name: 'View slides fullscreen' });
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-slide-presenter]')!;
  return { track, scrollTo, dialog, slide: () => Math.round(left / WIDTH) };
}

const counter = () => document.querySelector('[data-slide-deck-controls] span[aria-hidden="true"]')!.textContent;
const liveRegion = () => document.querySelector('[data-slide-deck-controls] > span[aria-live]')!.textContent;

describe('SlideDeck runtime', () => {
  test('buttons move one slide at a time and hide at the ends', async () => {
    const { slide } = await renderDeck();
    expect(screen.queryByRole('button', { name: 'Previous slide' })).toBeNull();
    expect(counter()).toBe('1 / 4');

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(slide()).toBe(1);
    expect(counter()).toBe('2 / 4');

    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(slide()).toBe(0);
  });

  test('keys on the focused deck flip slides; other keys pass through untouched', async () => {
    const { track, slide } = await renderDeck();
    const windowKeydown = mock((event: KeyboardEvent) => event.defaultPrevented);
    window.addEventListener('keydown', windowKeydown);
    try {
      fireEvent.keyDown(track, { key: 'ArrowRight' });
      expect(slide()).toBe(1);
      fireEvent.keyDown(track, { key: 'End' });
      expect(slide()).toBe(3);
      expect(screen.queryByRole('button', { name: 'Next slide' })).toBeNull();
      fireEvent.keyDown(track, { key: 'ArrowLeft' });
      expect(slide()).toBe(2);
      fireEvent.keyDown(track, { key: 'Home' });
      expect(slide()).toBe(0);
      // Modified arrows and unrelated keys are not the deck's.
      fireEvent.keyDown(track, { key: 'ArrowRight', metaKey: true });
      expect(slide()).toBe(0);
      fireEvent.keyDown(track, { key: '/' });
    } finally {
      window.removeEventListener('keydown', windowKeydown);
    }
    // Every key bubbled to window; only "/" (and the modified arrow) was left unhandled.
    const prevented = windowKeydown.mock.results.map((result) => result.value);
    expect(prevented).toEqual([true, true, true, true, false, false]);
  });

  test('announces the slide and puts it in the address once the reader flips', async () => {
    const replaceState = spyOn(window.history, 'replaceState');
    try {
      const { track } = await renderDeck();
      expect(liveRegion()).toBe('');
      // The test's own navigation is the only call so far.
      expect(replaceState).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(track, { key: 'ArrowRight' });
      expect(liveRegion()).toBe('Slide 2 of 4');
      expect(window.location.hash).toBe('#slides-2');
    } finally {
      replaceState.mockRestore();
    }
  });

  test('opens at the slide the address names, without rewriting it', async () => {
    const replaceState = spyOn(window.history, 'replaceState');
    try {
      const { scrollTo, slide } = await renderDeck('#slides-3');
      // The test's own navigation is the only call.
      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ left: 2 * WIDTH, behavior: 'auto' });
      expect(slide()).toBe(2);
      expect(counter()).toBe('3 / 4');
    } finally {
      replaceState.mockRestore();
    }
  });

  test('follows in-page links to a slide', async () => {
    const { slide } = await renderDeck();
    window.history.pushState(null, '', '#slides-4');
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(slide()).toBe(3);
  });

  test('loads the neighbouring slides once the deck nears the viewport, and every slide before printing', async () => {
    const { track } = await renderDeck();
    const loading = () => [...track.querySelectorAll('img')].map((img) => img.getAttribute('loading'));
    expect(loading()).toEqual(['lazy', 'lazy', 'lazy', 'lazy']);

    observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(loading()).toEqual(['eager', 'eager', 'lazy', 'lazy']);

    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(loading()).toEqual(['eager', 'eager', 'eager', 'lazy']);

    fireEvent(window, new Event('beforeprint'));
    expect(loading()).toEqual(['eager', 'eager', 'eager', 'eager']);
  });

  describe('presenter', () => {
    test('a click on a slide opens it in the presenter and locks the page', async () => {
      const { dialog } = await renderDeck();
      fireEvent.click(screen.getByAltText('Agenda'));

      expect(dialog.open).toBe(true);
      expect(dialog.getAttribute('aria-label')).toBe('My Talk');
      const shown = dialog.querySelector('img')!;
      expect(shown.getAttribute('src')).toBe('http://localhost:3000/posts/talk/slides/slide-02.png');
      expect(shown.getAttribute('alt')).toBe('Agenda');
      expect(document.documentElement.style.overflow).toBe('hidden');
      // A plain click doesn't go fullscreen.
      expect(requestFullscreen).not.toHaveBeenCalled();
    });

    test('keys flip slides inside it without reaching window; Escape closes and syncs the deck', async () => {
      const { dialog, slide } = await renderDeck();
      document.documentElement.style.overflow = 'clip';
      fireEvent.click(screen.getByAltText('Title'));
      const windowKeydown = mock(() => {});
      window.addEventListener('keydown', windowKeydown);
      try {
        fireEvent.keyDown(dialog, { key: 'PageDown' });
        fireEvent.keyDown(dialog, { key: ' ' });
        expect(dialog.querySelector('img')!.getAttribute('alt')).toBe('Architecture');
        fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
        fireEvent.keyDown(dialog, { key: 'Escape' });
      } finally {
        window.removeEventListener('keydown', windowKeydown);
      }

      expect(windowKeydown).not.toHaveBeenCalled();
      expect(dialog.open).toBe(false);
      expect(dialog.querySelector('img')).toBeNull();
      expect(slide()).toBe(1);
      expect(window.location.hash).toBe('#slides-2');
      expect(document.documentElement.style.overflow).toBe('clip');
    });

    test('a click on the shown slide advances; the close button closes', async () => {
      const { dialog } = await renderDeck();
      fireEvent.click(screen.getByAltText('Title'));
      fireEvent.click(dialog.querySelector('img')!);
      expect(dialog.querySelector('img')!.getAttribute('alt')).toBe('Agenda');
      fireEvent.click(screen.getByRole('button', { name: 'Close image' }));
      expect(dialog.open).toBe(false);
    });

    test('swipes flip slides on a stage the browser leaves horizontal moves to, and a tap still advances after one', async () => {
      const { dialog } = await renderDeck();
      fireEvent.click(screen.getByAltText('Title'));
      const stage = dialog.querySelector<HTMLElement>('div')!;
      expect(stage.className).toContain('touch-pan-y');
      const shown = () => dialog.querySelector('img')!.getAttribute('alt');

      // Swipe left: next slide. A touch swipe fires no click afterwards.
      fireEvent.pointerDown(stage, { isPrimary: true, clientX: 600, clientY: 300 });
      fireEvent.pointerUp(stage, { isPrimary: true, clientX: 300, clientY: 310 });
      expect(shown()).toBe('Agenda');

      // The next tap is a tap, not the tail of the swipe.
      const img = dialog.querySelector('img')!;
      fireEvent.pointerDown(img, { isPrimary: true, clientX: 500, clientY: 300 });
      fireEvent.pointerUp(img, { isPrimary: true, clientX: 500, clientY: 300 });
      fireEvent.click(img);
      expect(shown()).toBe('Architecture');

      // A cancelled gesture (the browser took over) is forgotten.
      fireEvent.pointerDown(stage, { isPrimary: true, clientX: 600, clientY: 300 });
      fireEvent.pointerCancel(stage, { isPrimary: true });
      fireEvent.pointerUp(stage, { isPrimary: true, clientX: 100, clientY: 300 });
      expect(shown()).toBe('Architecture');
    });

    test('F goes fullscreen on the stage inside the dialog, and leaving fullscreen closes it', async () => {
      const { track, dialog } = await renderDeck();
      fireEvent.keyDown(track, { key: 'f' });

      expect(dialog.open).toBe(true);
      expect(requestFullscreen).toHaveBeenCalledTimes(1);
      // A <dialog> can't be made fullscreen; its stage can.
      expect(requestedOn).not.toBe(dialog);
      expect(dialog.contains(requestedOn)).toBe(true);
      await waitFor(() => expect(screen.getAllByRole('button', { name: 'View slides fullscreen' }).at(-1)!.getAttribute('aria-pressed')).toBe('true'));

      // Escape in fullscreen: the browser exits fullscreen and keeps the key.
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      await waitFor(() => expect(dialog.open).toBe(false));
    });

    test('the fullscreen toggle leaves fullscreen but keeps presenting', async () => {
      const { dialog } = await renderDeck();
      fireEvent.click(screen.getAllByRole('button', { name: 'View slides fullscreen' })[0]);
      const toggle = () => screen.getAllByRole('button', { name: 'View slides fullscreen' }).at(-1)!;
      await waitFor(() => expect(toggle().getAttribute('aria-pressed')).toBe('true'));

      fireEvent.click(toggle());
      expect(exitFullscreen).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(toggle().getAttribute('aria-pressed')).toBe('false'));
      expect(dialog.open).toBe(true);
    });
  });
});
