import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { LanguageProvider } from '@/components/LanguageProvider';
import Navbar from '@/components/Navbar';

const stubRouter: AppRouterInstance = {
  push: () => {}, replace: () => {}, prefetch: () => Promise.resolve(), back: () => {}, forward: () => {}, refresh: () => {},
};

function Page({ pathname }: { pathname: string }) {
  return (
    <AppRouterContext.Provider value={stubRouter}>
      <PathnameContext.Provider value={pathname}>
        <LanguageProvider>
          <Navbar seriesList={[]} booksList={[]} />
          <main id="main-content"><button type="button">behind</button></main>
          <footer data-site-footer>footer</footer>
        </LanguageProvider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}

const toggle = () => screen.getByRole('button', { name: /open menu|close menu/i });

describe('mobile navigation menu', () => {
  test('opens as a panel: focus moves in, the page behind is inert, aria-controls is wired', () => {
    render(<Page pathname="/" />);
    fireEvent.click(toggle());
    const panel = screen.getByTestId('mobile-nav-panel');
    expect(toggle().getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.contains(document.activeElement)).toBe(true);
    expect(document.getElementById('main-content')!.hasAttribute('inert')).toBe(true);
    expect(document.querySelector('[data-site-footer]')!.hasAttribute('inert')).toBe(true);
  });

  test('Escape closes it, restores focus to the toggle and the page', () => {
    render(<Page pathname="/" />);
    fireEvent.click(toggle());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('mobile-nav-panel')).toBeNull();
    expect(document.activeElement).toBe(toggle());
    expect(document.getElementById('main-content')!.hasAttribute('inert')).toBe(false);
  });

  test('a route change (e.g. browser Back) closes it', () => {
    const { rerender } = render(<Page pathname="/" />);
    fireEvent.click(toggle());
    expect(screen.getByTestId('mobile-nav-panel')).toBeTruthy();
    act(() => rerender(<Page pathname="/posts/" />));
    expect(screen.queryByTestId('mobile-nav-panel')).toBeNull();
  });

  test('crossing the md breakpoint while open closes it and releases the page', () => {
    // A phone rotated to landscape: the md:hidden panel and toggle vanish.
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.delete(cb),
      addListener() {}, removeListener() {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      render(<Page pathname="/" />);
      fireEvent.click(toggle());
      expect(document.getElementById('main-content')!.hasAttribute('inert')).toBe(true);
      act(() => listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent)));
      expect(screen.queryByTestId('mobile-nav-panel')).toBeNull();
      expect(document.getElementById('main-content')!.hasAttribute('inert')).toBe(false);
      expect(document.body.style.overflow).toBe('');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
