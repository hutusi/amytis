import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/components/LanguageProvider';

const initialize = mock(() => {});
const renderChart = mock(async () => ({ svg: '<svg data-testid="diagram"></svg>' }));
mock.module('mermaid', () => ({ default: { initialize, render: renderChart } }));

const { default: Mermaid } = await import('@/components/Mermaid');

// Controllable IntersectionObserver: the test decides when the diagram
// scrolls near the viewport.
let observerCallback: IntersectionObserverCallback | null = null;
class FakeIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
}

const originalIO = globalThis.IntersectionObserver;
beforeEach(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver;
  initialize.mockClear();
  renderChart.mockClear();
  observerCallback = null;
});
afterEach(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalIO;
});

function enterViewport() {
  act(() => {
    observerCallback!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

describe('Mermaid', () => {
  test('does not load mermaid until the diagram nears the viewport', async () => {
    render(<LanguageProvider><Mermaid chart="graph TD; A-->B" /></LanguageProvider>);
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(renderChart).not.toHaveBeenCalled();

    enterViewport();
    await waitFor(() => {
      if (!document.querySelector('[data-testid="diagram"]')) throw new Error('diagram not rendered');
    });
    expect(renderChart).toHaveBeenCalledTimes(1);
  });

  test('renders with the sanitizing security level and no orphan error SVGs', async () => {
    render(<LanguageProvider><Mermaid chart="graph TD; A-->B" /></LanguageProvider>);
    enterViewport();
    await waitFor(() => { if (initialize.mock.calls.length === 0) throw new Error('not initialized'); });
    const config = (initialize.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(config.securityLevel).toBe('antiscript');
    expect(config.suppressErrorRendering).toBe(true);
  });

  test('shows a translated error instead of raw HTML when rendering fails', async () => {
    renderChart.mockImplementationOnce(async () => { throw new Error('Parse error'); });
    const errorSpy = mock(() => {});
    const originalError = console.error;
    console.error = errorSpy;
    try {
      render(<LanguageProvider locale="zh"><Mermaid chart="graph TD; A-->" /></LanguageProvider>);
      enterViewport();
      expect(await screen.findByText('图表无法渲染，请检查图表源码是否存在语法错误。')).toBeTruthy();
    } finally {
      console.error = originalError;
    }
  });
});
