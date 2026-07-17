import { describe, test, expect } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/components/LanguageProvider';
import { translations } from '@/i18n/translations';

const STORAGE_KEY = 'amytis-language';

/**
 * Consumer probe. Uses the `home` key: it is never overridden by
 * siteConfig.features.*.name (only series/books/flow/posts keys are), so the
 * assertions stay valid regardless of feature-name configuration.
 */
function Probe() {
  const { language, isHydrated, setLanguage, t, tWith } = useLanguage();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="hydrated">{String(isHydrated)}</span>
      <span data-testid="home">{t('home')}</span>
      <span data-testid="page">{tWith('page_of_total', { page: 2, total: 5 })}</span>
      <button onClick={() => setLanguage('zh')}>to-zh</button>
      <button onClick={() => setLanguage('en')}>to-en</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );
}

describe('LanguageProvider / useLanguage', () => {
  test('t() serves default-locale (en) strings with no stored preference', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });
    expect(screen.getByTestId('language').textContent).toBe('en');
    expect(screen.getByTestId('home').textContent).toBe(translations.en.home);
  });

  test('tWith() interpolates {params} into the translated string', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });
    expect(screen.getByTestId('page').textContent).toBe('Page 2 of 5');
  });

  test('setLanguage switches rendered strings and persists to localStorage', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });

    fireEvent.click(screen.getByText('to-zh'));
    await waitFor(() => {
      expect(screen.getByTestId('home').textContent).toBe(translations.zh.home);
    });
    expect(screen.getByTestId('language').textContent).toBe('zh');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('zh');

    fireEvent.click(screen.getByText('to-en'));
    await waitFor(() => {
      expect(screen.getByTestId('home').textContent).toBe(translations.en.home);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  test('hydration guard: stored language applies only after hydration', async () => {
    localStorage.setItem(STORAGE_KEY, 'zh');
    renderProbe();

    // Synchronously after render (before the RAF hydration flip) the provider
    // must still serve default-locale strings so CSR matches SSR output.
    expect(screen.getByTestId('hydrated').textContent).toBe('false');
    expect(screen.getByTestId('home').textContent).toBe(translations.en.home);

    // After hydration the stored language wins.
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });
    expect(screen.getByTestId('language').textContent).toBe('zh');
    expect(screen.getByTestId('home').textContent).toBe(translations.zh.home);
  });

  test('an unknown stored language falls back to the default locale', async () => {
    localStorage.setItem(STORAGE_KEY, 'fr');
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });
    expect(screen.getByTestId('language').textContent).toBe('en');
    expect(screen.getByTestId('home').textContent).toBe(translations.en.home);
  });

  test('useLanguage outside a LanguageProvider throws', () => {
    expect(() => render(<Probe />)).toThrow('useLanguage must be used within a LanguageProvider');
  });

  test('syncs <html lang> to the active language', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });
    // The mount effect applies the default locale to <html lang>.
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));

    fireEvent.click(screen.getByText('to-zh'));
    await waitFor(() => expect(document.documentElement.lang).toBe('zh'));

    fireEvent.click(screen.getByText('to-en'));
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  test('a throwing localStorage.getItem does not crash; falls back to default', async () => {
    const original = localStorage.getItem;
    // Simulate Safari private mode / storage disabled.
    localStorage.getItem = () => { throw new Error('storage blocked'); };
    try {
      renderProbe();
      await waitFor(() => {
        expect(screen.getByTestId('hydrated').textContent).toBe('true');
      });
      expect(screen.getByTestId('language').textContent).toBe('en');
      expect(screen.getByTestId('home').textContent).toBe(translations.en.home);
    } finally {
      localStorage.getItem = original;
    }
  });

  test('a throwing localStorage.setItem does not crash; in-memory switch still works', async () => {
    renderProbe();
    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('true');
    });

    const original = localStorage.setItem;
    localStorage.setItem = () => { throw new Error('quota exceeded'); };
    try {
      fireEvent.click(screen.getByText('to-zh'));
      await waitFor(() => {
        expect(screen.getByTestId('home').textContent).toBe(translations.zh.home);
      });
      expect(screen.getByTestId('language').textContent).toBe('zh');
    } finally {
      localStorage.setItem = original;
    }
  });
});
