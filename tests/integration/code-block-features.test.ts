import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import { renderAsync } from '@/test-utils/render';

describe('Integration: Code Block Features', () => {
  describe('Markdown / MDX', () => {
    test('highlights specific lines from {n,n-m} fence meta', async () => {
      const content = [
        '```ts {1,3-4}',
        'const a = 1;',
        'const b = 2;',
        'const c = 3;',
        'const d = 4;',
        '```',
      ].join('\n');

      const html = await renderAsync(MarkdownRenderer({ content }));

      // Lines 1, 3, 4 should be marked as highlighted; 2 should not.
      expect(html).toContain('data-highlighted-line="1"');
      expect(html).toContain('data-highlighted-line="3"');
      expect(html).toContain('data-highlighted-line="4"');
      expect(html).not.toContain('data-highlighted-line="2"');
    });

    test('opt-in line numbers via `linenos` fence meta', async () => {
      const content = ['```js linenos', 'const x = 1;', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('data-line-numbers="true"');
    });

    test('title bar from title="..." fence meta', async () => {
      const content = ['```ts title="src/app.ts"', 'export const x = 1;', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('src/app.ts');
      expect(html).toContain('cb-title');
    });

    test('diff fence colors +/- lines with diff add/remove classes', async () => {
      const content = ['```diff', '-old', '+new', ' unchanged', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('diff add');
      expect(html).toContain('diff remove');
    });

    test('mermaid blocks do not run through Shiki', async () => {
      const content = ['```mermaid', 'graph TD; A-->B;', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      // Mermaid is short-circuited in MarkdownRenderer before CodeBlock is invoked,
      // so no Shiki wrapper should appear for a mermaid fence.
      expect(html).not.toContain('class="shiki');
      // The Mermaid component delegates client-side rendering; assert its container.
      expect(html.toLowerCase()).toContain('mermaid');
    });

    test('unknown language throws at build time (strict build)', async () => {
      const content = ['```fakelang', 'should fail loudly', '```'].join('\n');

      let thrown: unknown = null;
      try {
        await renderAsync(MarkdownRenderer({ content }));
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(String(thrown)).toMatch(/fakelang/);
    });

    test('explicit `plaintext` fences render unhighlighted without erroring', async () => {
      const content = ['```plaintext', 'just prose', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('class="shiki');
      expect(html).toContain('just prose');
    });
  });

  describe('rST', () => {
    test('rST :linenos:, :emphasize-lines:, :caption: render through Shiki', async () => {
      const content = [
        'Section',
        '-------',
        '',
        '.. code-block:: python',
        '   :linenos:',
        '   :emphasize-lines: 1,3-4',
        '   :caption: app.py',
        '',
        '  def fib(n):',
        '      if n < 2:',
        '          return n',
        '      return fib(n - 1) + fib(n - 2)',
      ].join('\n');

      const html = await renderAsync(RstRenderer({ content }));

      expect(html).toContain('class="shiki');
      expect(html).toContain('data-line-numbers="true"');
      expect(html).toContain('data-highlighted-line="1"');
      expect(html).toContain('data-highlighted-line="3"');
      expect(html).toContain('data-highlighted-line="4"');
      // :caption: surfaces as title bar text in the wrapper header.
      expect(html).toContain('app.py');
    });

    test('rST :: literal block renders as plaintext through Shiki', async () => {
      const content = ['Section', '-------', '', 'Example::', '', '  plain literal'].join('\n');
      const html = await renderAsync(RstRenderer({ content }));

      expect(html).toContain('class="shiki');
      expect(html).toContain('plain literal');
    });
  });
});
