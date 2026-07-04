import { describe, test, expect, spyOn } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ImmersiveReadingProvider,
  useImmersiveReading,
} from '@/components/ImmersiveReadingProvider';
import { DEFAULT_PREFS, STORAGE_KEY, type StoredPrefs } from '@/lib/immersive-reading-prefs';

// NOTE ON SCOPE - the storage helpers (per-key defensive parsing, write
// silencing) are already covered by tests/unit/immersive-reading-prefs.test.ts;
// this file only covers the provider's DOM behavior on top of them: the
// first-run hydration guard (persist effect must not clobber stored prefs
// with React defaults on mount), persistence after changes, and the
// enabled/Escape lifecycle. ImmersiveReadingFlagHandler (the ?immersive=1
// deep link) is NOT tested here - it depends on next/navigation's
// useSearchParams/useRouter and belongs to a separate component anyway.

function Probe() {
  const ctx = useImmersiveReading();
  return (
    <div>
      <span data-testid="enabled">{String(ctx.enabled)}</span>
      <span data-testid="fontSize">{ctx.fontSize}</span>
      <span data-testid="readingTheme">{ctx.readingTheme}</span>
      <span data-testid="columnWidth">{ctx.columnWidth}</span>
      <span data-testid="sidebarOpen">{String(ctx.sidebarOpen)}</span>
      <span data-testid="prefsPanelOpen">{String(ctx.prefsPanelOpen)}</span>
      <button data-testid="enter" onClick={ctx.enter}>enter</button>
      <button data-testid="toggle-panel" onClick={ctx.togglePrefsPanel}>panel</button>
      <button data-testid="font-l" onClick={() => ctx.setFontSize('l')}>font-l</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <ImmersiveReadingProvider>
      <Probe />
    </ImmersiveReadingProvider>,
  );
}

const NON_DEFAULT_PREFS: StoredPrefs = {
  fontSize: 'xl',
  readingTheme: 'sepia',
  columnWidth: 'narrow',
  sidebarOpen: false,
};

describe('ImmersiveReadingProvider - prefs hydration & persistence', () => {
  test('first-run guard: mounting never clobbers stored prefs with defaults', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(NON_DEFAULT_PREFS));

    // Record every write so a TRANSIENT clobber (write defaults first, then
    // re-write stored values on the next render) is caught, not just the
    // final state.
    const writes: string[] = [];
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setSpy = spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === STORAGE_KEY) writes.push(value);
      originalSetItem(key, value);
    });

    try {
      renderProvider();

      await waitFor(() => {
        expect(screen.getByTestId('fontSize').textContent).toBe('xl');
      });
      expect(screen.getByTestId('readingTheme').textContent).toBe('sepia');
      expect(screen.getByTestId('columnWidth').textContent).toBe('narrow');
      expect(screen.getByTestId('sidebarOpen').textContent).toBe('false');

      // The stored blob survived the mount untouched...
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(NON_DEFAULT_PREFS);
      // ...and at no point were the React defaults written over it.
      for (const value of writes) {
        expect(JSON.parse(value)).not.toEqual(DEFAULT_PREFS);
      }
    } finally {
      setSpy.mockRestore();
    }
  });

  test('starts from defaults when nothing is stored', async () => {
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('fontSize').textContent).toBe(DEFAULT_PREFS.fontSize);
    });
    expect(screen.getByTestId('readingTheme').textContent).toBe(DEFAULT_PREFS.readingTheme);
    expect(screen.getByTestId('columnWidth').textContent).toBe(DEFAULT_PREFS.columnWidth);
    expect(screen.getByTestId('sidebarOpen').textContent).toBe(String(DEFAULT_PREFS.sidebarOpen));
  });

  test('persists a pref change after hydration', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(NON_DEFAULT_PREFS));
    renderProvider();
    await waitFor(() => {
      expect(screen.getByTestId('fontSize').textContent).toBe('xl');
    });

    fireEvent.click(screen.getByTestId('font-l'));
    await waitFor(() => {
      expect(screen.getByTestId('fontSize').textContent).toBe('l');
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      ...NON_DEFAULT_PREFS,
      fontSize: 'l',
    });
  });
});

describe('ImmersiveReadingProvider - enabled state & Escape key', () => {
  test('enter() sets the html flag and locks body scroll; Escape exits', async () => {
    renderProvider();
    expect(screen.getByTestId('enabled').textContent).toBe('false');

    fireEvent.click(screen.getByTestId('enter'));
    expect(screen.getByTestId('enabled').textContent).toBe('true');
    expect(document.documentElement.dataset.immersive).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.getByTestId('enabled').textContent).toBe('false');
    });
    expect(document.documentElement.dataset.immersive).toBeUndefined();
    expect(document.body.style.overflow).toBe('');
  });

  test('Escape closes the prefs panel first, then exits on a second press', async () => {
    renderProvider();
    fireEvent.click(screen.getByTestId('enter'));
    fireEvent.click(screen.getByTestId('toggle-panel'));
    expect(screen.getByTestId('prefsPanelOpen').textContent).toBe('true');

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.getByTestId('prefsPanelOpen').textContent).toBe('false');
    });
    expect(screen.getByTestId('enabled').textContent).toBe('true');

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.getByTestId('enabled').textContent).toBe('false');
    });
  });

  test('non-Escape keys and Escape-while-disabled are ignored', () => {
    renderProvider();

    // Not enabled: Escape listener is not even attached.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByTestId('enabled').textContent).toBe('false');

    fireEvent.click(screen.getByTestId('enter'));
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByTestId('enabled').textContent).toBe('true');
  });
});

describe('useImmersiveReading', () => {
  test('throws outside an ImmersiveReadingProvider', () => {
    expect(() => render(<Probe />)).toThrow(
      'useImmersiveReading must be used within an ImmersiveReadingProvider',
    );
  });
});
