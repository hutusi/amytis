import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import BackToTop from '@/components/BackToTop';
import { LanguageProvider } from '@/components/LanguageProvider';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function setDocumentHeight(height: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: height });
}

async function scrollTo(y: number) {
  await act(async () => {
    window.scrollTo(0, y);
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
  });
}

function renderButton() {
  const main = document.createElement('main');
  main.id = 'main-content';
  document.body.appendChild(main);
  render(
    <LanguageProvider>
      <BackToTop />
    </LanguageProvider>,
  );
  // Hidden it is `invisible`, so role queries can't see it: find it by its hook.
  return { main, button: document.querySelector<HTMLButtonElement>('[data-back-to-top]')! };
}

afterEach(() => {
  setDocumentHeight(0);
  window.scrollTo(0, 0);
});

describe('BackToTop', () => {
  test('appears only past two screens of scrolling', async () => {
    setDocumentHeight(window.innerHeight * 6);
    const { button } = renderButton();
    await act(nextFrame);
    expect(button.className).toContain('invisible');

    await scrollTo(window.innerHeight * 2 - 10);
    expect(button.className).toContain('invisible');

    await scrollTo(window.innerHeight * 2 + 10);
    expect(button.className).not.toContain('invisible');
    expect(screen.getByRole('button', { name: 'Back to top' })).toBe(button);

    await scrollTo(0);
    expect(button.className).toContain('invisible');
  });

  test('scrolls to the top and moves focus to the main content', async () => {
    setDocumentHeight(window.innerHeight * 6);
    const { main, button } = renderButton();
    await scrollTo(window.innerHeight * 3);
    const scroll = mock(() => {});
    const original = window.scrollTo;
    window.scrollTo = scroll as unknown as typeof window.scrollTo;
    try {
      fireEvent.click(button);
    } finally {
      window.scrollTo = original;
    }

    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute('tabindex')).toBe('-1');

    // The temporary tabindex goes once focus moves on.
    main.blur();
    expect(main.hasAttribute('tabindex')).toBe(false);
  });

  test('leaves an existing tabindex on the main content alone', async () => {
    setDocumentHeight(window.innerHeight * 6);
    const { main, button } = renderButton();
    main.setAttribute('tabindex', '0');
    await scrollTo(window.innerHeight * 3);
    fireEvent.click(button);
    main.blur();
    expect(main.getAttribute('tabindex')).toBe('0');
  });
});
