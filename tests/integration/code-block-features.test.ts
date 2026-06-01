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

    // Extract the Mermaid outer-wrapper class string so token assertions are
    // order-independent and scoped to the wrapper — not the surrounding prose
    // chrome (which carries `prose-code:*` utilities that share substrings).
    const findMermaidWrapperClass = (html: string): string => {
      // The wrapper precedes the inner `class="mermaid ..."` element. Match the
      // *previous* class attribute by anchoring on the inner mermaid class.
      const m = html.match(/class="([^"]*)"\s*><div class="mermaid /);
      return m?.[1] ?? '';
    };

    test('mermaid renders with a frameless wrapper (no border/padding/shadow)', async () => {
      // Mermaid SVG nodes carry their own borders, so the prose pipeline does
      // not wrap diagrams in a framed container the way it wraps tables.
      const content = ['```mermaid', 'graph TD; A-->B;', '```'].join('\n');
      const html = await renderAsync(MarkdownRenderer({ content }));
      const wrapper = findMermaidWrapperClass(html);

      expect(wrapper).toContain('my-6');
      expect(wrapper).toContain('overflow-x-auto');
      expect(wrapper).not.toContain('shadow-sm');
      expect(wrapper).not.toContain('p-4');
      expect(wrapper).not.toContain('md:p-8');
      expect(wrapper).not.toContain('border');
      expect(html.toLowerCase()).toContain('mermaid');
    });

    test('legacy `compact` fence meta is a no-op (no regression for old content)', async () => {
      // ` ```mermaid compact ` used to opt out of a framed wrapper that no
      // longer exists. The flag stays unrecognised by the pipeline and must
      // render identically to a bare ` ```mermaid ` fence — otherwise the 52
      // historical `compact` blocks in `content/` would regress.
      const bare = await renderAsync(
        MarkdownRenderer({ content: ['```mermaid', 'graph TD; A-->B;', '```'].join('\n') }),
      );
      const withCompact = await renderAsync(
        MarkdownRenderer({ content: ['```mermaid compact', 'graph TD; A-->B;', '```'].join('\n') }),
      );

      expect(findMermaidWrapperClass(withCompact)).toBe(findMermaidWrapperClass(bare));
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
