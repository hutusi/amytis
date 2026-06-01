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

    test('mermaid default fence renders with the framed wrapper', async () => {
      const content = ['```mermaid', 'graph TD; A-->B;', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      // Framed wrapper carries padding + shadow + the my-8 margin. These
      // tokens appear only on the Mermaid wrapper — using them rather than
      // substrings like `border-muted/20` avoids matching prose-code:*
      // utilities present on the surrounding article wrapper.
      expect(html).toMatch(/class="my-8 p-4 md:p-8[^"]*shadow-sm"/);
    });

    test('mermaid `compact` fence meta drops the framed wrapper', async () => {
      const content = ['```mermaid compact', 'graph TD; A-->B;', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      // `compact` is detected from the fence meta and the Mermaid component
      // swaps to a frameless wrapper (my-6 + overflow only, no padding /
      // border / shadow) so the SVG can use the full column width.
      expect(html).toMatch(/class="my-6 overflow-x-auto"/);
      expect(html).not.toContain('shadow-sm');
      expect(html).not.toMatch(/class="[^"]*p-4 md:p-8/);
      // Still wrapped — assert the inner mermaid container is present.
      expect(html.toLowerCase()).toContain('mermaid');
    });

    test('unknown language renders as plaintext (warn-and-degrade)', async () => {
      // Production deploys can't fail on a single unknown fence — render as
      // plaintext and emit a build-time warn instead. Three previous failures
      // (make, golang, plus the alias overlay) demonstrated that strict-build
      // at the fence-language layer was the wrong trade-off.
      const content = ['```fakelang', 'should still render', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('class="shiki');
      expect(html).toContain('should still render');
      // Should NOT throw.
    });

    test('explicit `plaintext` fences render unhighlighted without erroring', async () => {
      const content = ['```plaintext', 'just prose', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('class="shiki');
      expect(html).toContain('just prose');
    });

    test('previously-unregistered Shiki languages (make, dockerfile, etc.) lazy-load on demand', async () => {
      // Regression: production build broke when a real post used ```make. The fix
      // resolves any of Shiki's ~235 bundled languages via its own metadata; the lang
      // is loaded the first time it's seen, no hand-maintained allowlist required.
      const content = ['```make', 'all:', '\t@echo "Building..."', '\tgcc -o app main.c', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('class="shiki');
      // Header label uses Shiki's proper-case name from bundledLanguagesInfo.
      expect(html).toContain('>Makefile<');
      // Source lines survive and get token coloring.
      expect(html).toContain('all');
      expect(html).toContain('gcc');
    });

    test('community-alias `golang` resolves to Go (regression: production build)', async () => {
      // Shiki does NOT list `golang` as an alias of `go` in its bundledLanguagesInfo,
      // so a fence using ```golang would throw before the COMMUNITY_ALIASES overlay
      // was added. The overlay maps it to the bundled `go` grammar.
      const content = ['```golang', 'package main', '', 'func main() {', '\tprintln("hi")', '}', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('class="shiki');
      expect(html).toContain('>Go<');
      expect(html).toContain('package');
      expect(html).toContain('main');
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
