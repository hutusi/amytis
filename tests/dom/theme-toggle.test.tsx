import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { LanguageProvider } from '@/components/LanguageProvider';
import ThemeToggle from '@/components/ThemeToggle';

/**
 * next-themes is configured deterministically: explicit light default and no
 * system-preference resolution, so each click flips light <-> dark exactly.
 */
function renderToggle() {
  return render(
    <LanguageProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ThemeToggle />
      </ThemeProvider>
    </LanguageProvider>,
  );
}

/** The mounted (post-RAF) button is the one carrying the aria-label. */
async function findMountedToggle(): Promise<HTMLButtonElement> {
  await waitFor(() => {
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe('Toggle theme');
  });
  return screen.getByRole('button') as HTMLButtonElement;
}

describe('ThemeToggle', () => {
  test('renders an inert placeholder before mount, then the labelled toggle', async () => {
    renderToggle();

    // Synchronously after render the mount RAF has not fired yet: the
    // placeholder has no aria-label and only the sr-only text.
    const placeholder = screen.getByRole('button');
    expect(placeholder.getAttribute('aria-label')).toBeNull();
    expect(placeholder.textContent).toBe('Toggle theme');
    expect(placeholder.querySelector('svg')).toBeNull();

    // After the RAF-driven mount flip, the real button appears with the
    // aria-label and an icon instead of the sr-only span.
    const button = await findMountedToggle();
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.querySelector('.sr-only')).toBeNull();
  });

  test('click toggles dark mode on and off (class + persisted preference)', async () => {
    renderToggle();
    const button = await findMountedToggle();

    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(button);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    expect(localStorage.getItem('theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    expect(localStorage.getItem('theme')).toBe('light');
  });

  test('mounted toggle keeps an accessible name', async () => {
    renderToggle();
    const button = await findMountedToggle();
    expect(button.getAttribute('aria-label')).toBe('Toggle theme');
  });
});

/**
 * System-theme resolution: the toggle must act on the *resolved* theme, not the
 * literal "system" value. Otherwise a system-dark visitor's first click is a
 * no-op (setTheme('dark') on an already-dark page) and the icon is wrong.
 */
describe('ThemeToggle under system preference', () => {
  function mockPrefersColorScheme(dark: boolean) {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('dark') ? dark : !dark,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    return () => { window.matchMedia = original; };
  }

  function renderSystemToggle() {
    return render(
      <LanguageProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeToggle />
        </ThemeProvider>
      </LanguageProvider>,
    );
  }

  test('system-dark: shows the sun icon and first click flips to light', async () => {
    const restore = mockPrefersColorScheme(true);
    try {
      renderSystemToggle();
      const button = await findMountedToggle();

      // System resolves to dark, so the page is dark and the icon is the sun
      // (rendered with a <circle>; the moon is a lone <path>).
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
      expect(button.querySelector('circle')).not.toBeNull();

      // The regression: one click must produce a visible change (dark -> light),
      // not setTheme('dark') on an already-dark page.
      fireEvent.click(button);
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
      expect(localStorage.getItem('theme')).toBe('light');
    } finally {
      restore();
    }
  });

  test('system-light: shows the moon icon and first click flips to dark', async () => {
    const restore = mockPrefersColorScheme(false);
    try {
      renderSystemToggle();
      const button = await findMountedToggle();

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
      expect(button.querySelector('circle')).toBeNull(); // moon icon

      fireEvent.click(button);
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
      expect(localStorage.getItem('theme')).toBe('dark');
    } finally {
      restore();
    }
  });
});
