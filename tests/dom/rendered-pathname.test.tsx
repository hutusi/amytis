import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { act, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { waitFor } from '@testing-library/react';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import NotFound from '@/app/not-found';
import { LanguageProvider, useLanguage } from '@/components/LanguageProvider';
import { translations } from '@/i18n/translations';

/**
 * Static hosts serve the one exported 404.html (prerendered at /_not-found)
 * for every unknown URL, /zh/… included. These tests server-render at one
 * pathname and hydrate at another, the way that file is actually used, and
 * collect React's hydration-mismatch reports.
 */
function Probe() {
  const { language, t } = useLanguage();
  return <p data-testid="probe">{`${language}:${t('home')}`}</p>;
}

const roots: Root[] = [];
afterEach(() => {
  act(() => roots.splice(0).forEach(root => root.unmount()));
});

async function serveAt(renderedFor: string, requested: string, tree: (pathname: string) => ReactElement) {
  const container = document.createElement('div');
  container.innerHTML = renderToString(tree(renderedFor));
  document.body.appendChild(container);
  const mismatches: unknown[] = [];
  await act(async () => {
    roots.push(hydrateRoot(container, tree(requested), { onRecoverableError: error => mismatches.push(error) }));
  });
  return { container, mismatches };
}

const notFoundPage = (pathname: string) => (
  <PathnameContext.Provider value={pathname}>
    <LanguageProvider twinnedPaths={{ zh: ['/'] }}>
      <Probe />
      <NotFound />
    </LanguageProvider>
  </PathnameContext.Provider>
);

describe('fallback 404 hydration (useRenderedPathname)', () => {
  test('hydrates against the stamped pathname, then switches to the URL locale', async () => {
    const { container, mismatches } = await serveAt('/_not-found', '/zh/missing/', notFoundPage);

    expect(mismatches).toEqual([]);
    const probe = container.querySelector('[data-testid="probe"]')!;
    await waitFor(() => expect(probe.textContent).toBe(`zh:${translations.zh.home}`));
    expect(container.querySelector('[data-rendered-pathname]')!.getAttribute('data-rendered-pathname')).toBe('/zh/missing/');
    // Links stay in the locale only where the target exists there.
    const hrefs = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/archive', '/tags', '/zh']);
  });

  test('a page served at the path it was rendered for hydrates in its own locale', async () => {
    const { container, mismatches } = await serveAt('/zh/missing/', '/zh/missing/', notFoundPage);

    expect(mismatches).toEqual([]);
    expect(container.querySelector('[data-testid="probe"]')!.textContent).toBe(`zh:${translations.zh.home}`);
  });

  test('without the stamp, rendering from the requested pathname mismatches', async () => {
    // Control: proves the harness detects the failure the stamp prevents.
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    const page = (pathname: string) => (
      <PathnameContext.Provider value={pathname}>
        <LanguageProvider>
          <Probe />
        </LanguageProvider>
      </PathnameContext.Provider>
    );
    const { mismatches } = await serveAt('/_not-found', '/zh/missing/', page);
    consoleError.mockRestore();

    expect(mismatches.length).toBeGreaterThan(0);
  });
});
