import { describe, test, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  AppRouterContext,
  type AppRouterInstance,
} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { LanguageProvider } from '@/components/LanguageProvider';
import Search from '@/components/Search';
import { openSearch } from '@/lib/search-events';
import { __resetPagefindForTests } from '@/hooks/usePagefind';

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

    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search' }), { key: 'Escape' });

    await waitFor(() => {
      if (screen.queryByRole('dialog') !== null) throw new Error('dialog still open');
    });
    expect(document.activeElement === trigger).toBe(true);
  });

  test('Escape in the dialog does not reach window-level listeners (immersive reader)', async () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByRole('dialog', { name: 'Search' });

    let windowSawEscape = false;
    const onWindowKey = (e: KeyboardEvent) => { if (e.key === 'Escape') windowSawEscape = true; };
    window.addEventListener('keydown', onWindowKey);
    try {
      fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search' }), { key: 'Escape' });
      await waitFor(() => {
        if (screen.queryByRole('dialog') !== null) throw new Error('dialog still open');
      });
      expect(windowSawEscape).toBe(false);
    } finally {
      window.removeEventListener('keydown', onWindowKey);
    }
  });

  test('"/" opens the search unless the user is typing in a field', async () => {
    renderSearch();
    const field = document.createElement('input');
    document.body.appendChild(field);
    try {
      fireEvent.keyDown(field, { key: '/' });
      expect(screen.queryByRole('dialog')).toBeNull();

      fireEvent.keyDown(document.body, { key: '/' });
      expect(await screen.findByRole('dialog', { name: 'Search' })).toBeTruthy();
    } finally {
      field.remove();
    }
  });

  test('other components can open it through openSearch() (e.g. the 404 page)', async () => {
    renderSearch();
    expect(screen.queryByRole('dialog')).toBeNull();
    const opener = document.createElement('button');
    opener.textContent = 'Search the site';
    document.body.appendChild(opener);
    try {
      opener.focus();
      act(() => openSearch());
      const input = await screen.findByRole('combobox', { name: 'Search' });
      // Closing returns to the component's own button, not the navbar trigger.
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });

  test('Escape works immediately after opening (focus moves in synchronously)', () => {
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('closing with Cmd/Ctrl+K still returns focus to the original opener', async () => {
    renderSearch();
    const link = document.createElement('a');
    link.href = '#elsewhere';
    link.textContent = 'another link';
    document.body.appendChild(link);
    try {
      link.focus();
      fireEvent.keyDown(link, { key: '/' });
      const input = await screen.findByRole('combobox', { name: 'Search' });
      // The toggle shortcut fires with focus inside the dialog.
      fireEvent.keyDown(input, { key: 'k', metaKey: true });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(link);
    } finally {
      link.remove();
    }
  });

  test('closing returns focus to the element that had it when "/" opened search', async () => {
    renderSearch();
    const link = document.createElement('a');
    link.href = '#somewhere';
    link.textContent = 'a page link';
    document.body.appendChild(link);
    try {
      link.focus();
      fireEvent.keyDown(link, { key: '/' });
      const input = await screen.findByRole('combobox', { name: 'Search' });
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(document.activeElement).toBe(link);
    } finally {
      link.remove();
    }
  });
});

describe('Search modal with results', () => {
  afterEach(() => __resetPagefindForTests());

  test('Enter during IME composition commits the text instead of navigating', async () => {
    __resetPagefindForTests(async () => ({
      init: async () => {},
      destroy: async () => {},
      search: async () => ({
        results: [{ data: async () => ({ url: '/posts/a/', excerpt: 'x', meta: { title: 'Post A', date: '2026-01-01' }, word_count: 1 }) }],
      }),
    }));
    const push = mock(() => {});
    render(
      <AppRouterContext.Provider value={{ ...stubRouter, push }}>
        <LanguageProvider>
          <Search />
        </LanguageProvider>
      </AppRouterContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const input = screen.getByRole('combobox', { name: 'Search' });
    fireEvent.change(input, { target: { value: '文章' } });
    await screen.findByText('Post A');

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(push).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/posts/a/');
  });

  test('tabs show the indexed per-type counts and switch to that type', async () => {
    const page = (url: string, type: string) => ({
      data: async () => ({ url, excerpt: 'x', meta: { title: url }, filters: { type: [type] }, word_count: 1 }),
    });
    const posts = Array.from({ length: 12 }, (_, i) => page(`/posts/p${i}/`, 'Post'));
    const flows = [page('/flows/2026/01/02/', 'Flow')];
    let filtersLoaded = false;
    __resetPagefindForTests(async () => ({
      init: async () => {},
      destroy: async () => {},
      filters: async () => { filtersLoaded = true; return {}; },
      search: async (_q: string, options?: { filters?: Record<string, string> }) => {
        const type = options?.filters?.type;
        const results = type === 'Flow' ? flows : type === 'Post' ? posts : [...posts, ...flows];
        const counts = type ? { [type]: results.length } : { Post: 12, Flow: 1 };
        return { results, filters: filtersLoaded ? { type: counts } : {} };
      },
    }));
    render(
      <AppRouterContext.Provider value={stubRouter}>
        <LanguageProvider>
          <Search />
        </LanguageProvider>
      </AppRouterContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Search' }), { target: { value: 'q' } });
    await screen.findByText('/posts/p0/');

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('data-type'))).toEqual(['All', 'Post', 'Flow']);
    expect(tabs.map((tab) => tab.querySelector('span')?.textContent)).toEqual(['13', '12', '1']);

    fireEvent.click(tabs[2]);
    await screen.findByText('/flows/2026/01/02/');
    expect(screen.queryByText('/posts/p0/')).toBeNull();
    expect(screen.getByRole('tab', { selected: true }).getAttribute('data-type')).toBe('Flow');
  });
});
