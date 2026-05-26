import type { ReactElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';

/**
 * Renders a React tree (including async server components) to a full HTML string.
 * Use this in tests where the tree contains async components — sync renderers like
 * renderToStaticMarkup throw "A component suspended" for async server components.
 */
export async function renderAsync(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
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
