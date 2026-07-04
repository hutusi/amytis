import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { LanguageProvider } from '@/components/LanguageProvider';
import Search from '@/components/Search';

// Modal focus lifecycle. Pagefind itself is absent in this environment (the
// dynamic import fails and Search flips to its unavailable state), which is
// fine — these tests cover the dialog chrome, not result fetching.

const stubRouter: AppRouterInstance = {
  push: () => {},
  replace: () => {},
  prefetch: () => Promise.resolve(),
  back: () => {},
  forward: () => {},
  refresh: () => {},
};

function renderSearch() {
  return render(
    <AppRouterContext.Provider value={stubRouter}>
      <LanguageProvider>
        <Search />
      </LanguageProvider>
    </AppRouterContext.Provider>,
  );
}

describe('Search modal', () => {
  test('opens from the trigger and focuses the input', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    const dialog = await screen.findByRole('dialog', { name: 'Search' });
    expect(dialog).toBeTruthy();

    const input = screen.getByRole('combobox', { name: 'Search' });
    // Focus is applied on a 100ms timer after open. Throw a plain Error
    // instead of expect(...).toBe(element): a failing element comparison
    // makes bun's expect serialize the whole happy-dom node per poll, which
    // is slow enough to blow the waitFor budget.
    await waitFor(() => {
      if (document.activeElement !== input) {
        throw new Error(`focus is on ${document.activeElement?.tagName ?? 'nothing'}`);
      }
    });
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
  });

  test('Escape closes the modal and restores focus to the trigger', async () => {
    renderSearch();
    const trigger = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(trigger);
    await screen.findByRole('dialog', { name: 'Search' });

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      if (screen.queryByRole('dialog') !== null) throw new Error('dialog still open');
    });
    expect(document.activeElement === trigger).toBe(true);
  });
});
