import { createElement, type ReactElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { LanguageProvider } from '@/components/LanguageProvider';

/**
 * Renders a React tree (including async server components) to a full HTML string.
 * Use this in tests where the tree contains async components — sync renderers like
 * renderToStaticMarkup throw "A component suspended" for async server components.
 *
 * Accepts a Promise too: calling an async server component directly
 * (`renderAsync(Page(props))`) yields `Promise<ReactElement>`, which
 * renderToReadableStream awaits just like any other ReactNode.
 */
export async function renderAsync(
  element: ReactElement | Promise<ReactElement>,
): Promise<string> {
  // Mirror production wiring: the root layout always mounts LanguageProvider,
  // so components may call useLanguage() anywhere in the tree. The provider
  // renders children directly — it adds no markup to the output.
  const stream = await renderToReadableStream(
    createElement(LanguageProvider, null, element),
  );
  await stream.allReady;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) html += decoder.decode(value, { stream: !done });
  }
  // Flush any trailing buffered bytes from incomplete sequences (no-op for well-formed UTF-8).
  html += decoder.decode();
  return html;
}
