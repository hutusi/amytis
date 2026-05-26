import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import { renderAsync } from '@/test-utils/render';

describe('Integration: Code Group Tabs', () => {
  describe('Markdown / MDX :::code-group', () => {
    test('three-tab npm/yarn/bun group renders the radio + label + panel structure', async () => {
      const content = [
        ':::code-group',
        '```bash [npm]',
        'npm install foo',
        '```',
        '```bash [yarn]',
        'yarn add foo',
        '```',
        '```bash [bun]',
        'bun add foo',
        '```',
        ':::',
      ].join('\n');

      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('class="code-group');
      expect((html.match(/type="radio"/g) || []).length).toBe(3);
      expect((html.match(/class="cg-panel"/g) || []).length).toBe(3);
      // First tab checked by default.
      expect(html).toMatch(/data-idx="0"[^>]*checked/);
      expect(html).not.toMatch(/data-idx="1"[^>]*checked/);
      // All three labels surfaced.
      expect(html).toContain('>npm<');
      expect(html).toContain('>yarn<');
      expect(html).toContain('>bun<');
    });

    test('missing [label] falls back to the language name', async () => {
      const content = [
        ':::code-group',
        '```bash',
        'echo bare',
        '```',
        '```python',
        'print("bare")',
        '```',
        ':::',
      ].join('\n');

      const html = await renderAsync(MarkdownRenderer({ content }));

      expect(html).toContain('>bash<');
      expect(html).toContain('>python<');
    });

    test('inner blocks still go through Shiki', async () => {
      const content = [
        ':::code-group',
        '```ts [TS]',
        'export const x: number = 1;',
        '```',
        '```python [Py]',
        'def f(): return 1',
        '```',
        ':::',
      ].join('\n');

      const html = await renderAsync(MarkdownRenderer({ content }));

      // Both panels should contain a Shiki-highlighted <pre>.
      expect((html.match(/class="shiki/g) || []).length).toBe(2);
    });
  });

  describe('rST .. code-group:: (fallback parser path)', () => {
    test('rST code-group with :label: per inner block renders the same structure', async () => {
      const content = [
        'Heading',
        '=======',
        '',
        '.. code-group::',
        '',
        '   .. code-block:: bash',
        '      :label: npm',
        '',
        '      npm install foo',
        '',
        '   .. code-block:: bash',
        '      :label: yarn',
        '',
        '      yarn add foo',
      ].join('\n');

      const html = await renderAsync(RstRenderer({ content }));

      expect(html).toContain('class="code-group');
      expect((html.match(/type="radio"/g) || []).length).toBe(2);
      expect((html.match(/class="cg-panel"/g) || []).length).toBe(2);
      expect(html).toContain('>npm<');
      expect(html).toContain('>yarn<');
    });

    test('sanitize-html keeps the radio + label markup intact on the html-path', async () => {
      // Simulate what the Python rST renderer would emit: a div data-amytis-code-group
      // wrapper around <pre data-amytis-code> marker children. The applyShikiToRstHtml
      // pass then expands it into the tab structure, and sanitize-html must keep the
      // <input type=radio> and <label for=...> markup intact.
      const wrapperHtml =
        '<div data-amytis-code-group="" data-labels="[&quot;npm&quot;,&quot;yarn&quot;]" data-group-id="rst-test1">' +
        '<pre data-amytis-code="" data-language="bash"><code>npm install foo</code></pre>' +
        '<pre data-amytis-code="" data-language="bash"><code>yarn add foo</code></pre>' +
        '</div>';

      const html = await renderAsync(RstRenderer({ content: 'unused', html: wrapperHtml }));

      expect(html).toContain('class="code-group');
      expect(html).toContain('type="radio"');
      expect((html.match(/type="radio"/g) || []).length).toBe(2);
      expect(html).toContain('for="cg-rst-test1-0"');
      expect(html).toContain('>npm<');
      expect(html).toContain('>yarn<');
    });

    test('non-radio inputs are downgraded by transformTags', async () => {
      // If an rST author tries to inject a non-radio input through raw HTML, the
      // transformTags rule should strip the tagName down to <span>.
      const malicious = '<p>before</p><input type="password" name="x"><p>after</p>';
      const html = await renderAsync(RstRenderer({ content: 'unused', html: malicious }));

      expect(html).not.toContain('<input');
      expect(html).toContain('before');
      expect(html).toContain('after');
    });
  });
});
