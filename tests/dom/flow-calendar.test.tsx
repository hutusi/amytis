import { describe, test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { LanguageProvider } from '@/components/LanguageProvider';
import FlowCalendarSidebar from '@/components/FlowCalendarSidebar';

const stubRouter: AppRouterInstance = {
  push: () => {},
  replace: () => {},
  prefetch: () => Promise.resolve(),
  back: () => {},
  forward: () => {},
  refresh: () => {},
};

function renderCalendar(props: { currentDate?: string; initialMonth?: string }) {
  return render(
    <AppRouterContext.Provider value={stubRouter}>
      <LanguageProvider>
        <FlowCalendarSidebar entryDates={['2026-02-05', '2026-02-10', '2026-03-02']} {...props} />
      </LanguageProvider>
    </AppRouterContext.Provider>,
  );
}

const dayLinks = (container: HTMLElement) =>
  [...container.querySelectorAll('a[href^="/flows/2026/"]')]
    .map((a) => a.getAttribute('href'))
    .filter((href) => /\/flows\/\d{4}\/\d{2}\/\d{2}$/.test(href ?? ''));

describe('FlowCalendarSidebar', () => {
  test('a month archive opens on its month and links only days that have a flow', () => {
    const { container } = renderCalendar({ initialMonth: '2026-02' });
    expect(dayLinks(container)).toEqual(['/flows/2026/02/05', '/flows/2026/02/10']);
    // No day is highlighted as current on an archive.
    expect(container.querySelector('a.bg-accent, div.bg-accent')).toBeNull();
  });

  test('a day page highlights and links its own day', () => {
    const { container } = renderCalendar({ currentDate: '2026-02-10' });
    const current = container.querySelector('a.bg-accent');
    expect(current?.getAttribute('href')).toBe('/flows/2026/02/10');
    expect(dayLinks(container)).toEqual(['/flows/2026/02/05', '/flows/2026/02/10']);
  });

  test('a current date without a flow is never linked', () => {
    const { container } = renderCalendar({ currentDate: '2026-02-01' });
    expect(dayLinks(container)).not.toContain('/flows/2026/02/01');
  });
});
