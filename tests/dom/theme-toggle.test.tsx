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
