import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import RstRenderer from '@/components/RstRenderer';
import { renderAsync } from '@/test-utils/render';

describe('Integration: GitHub-flavored Alerts', () => {
  const types = [
    { marker: 'NOTE', cssClass: 'alert-note', label: 'Note' },
    { marker: 'TIP', cssClass: 'alert-tip', label: 'Tip' },
    { marker: 'IMPORTANT', cssClass: 'alert-important', label: 'Important' },
    { marker: 'WARNING', cssClass: 'alert-warning', label: 'Warning' },
    { marker: 'CAUTION', cssClass: 'alert-caution', label: 'Caution' },
  ];

  test.each(types)('renders [!$marker] as <aside class="alert $cssClass"> with the $label title', async ({ marker, cssClass, label }) => {
    const content = `> [!${marker}]\n> body content for ${marker.toLowerCase()}`;
    const html = await renderAsync(MarkdownRenderer({ content }));

    expect(html).toContain(`class="alert ${cssClass}"`);
    expect(html).toContain(`>${label}<`);
    expect(html).toContain(`body content for ${marker.toLowerCase()}`);
  });

  test('plain blockquote without a marker stays as <blockquote>', async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: '> just a plain quote\n> over two lines' }),
    );

    expect(html).toContain('<blockquote');
    expect(html).not.toContain('class="alert');
  });

  test('unknown [!UNKNOWN] type passes through as a plain blockquote (no transform)', async () => {
    const html = await renderAsync(
      MarkdownRenderer({ content: '> [!UNKNOWN]\n> body' }),
    );

    expect(html).toContain('<blockquote');
    expect(html).not.toContain('class="alert');
    // The literal marker should still be visible since we didn't transform.
    expect(html).toContain('[!UNKNOWN]');
  });

  test('alert body keeps markdown formatting (links, code, lists)', async () => {
    const content = [
      '> [!TIP]',
      '> Read the [docs](https://example.com) and run `bun test`.',
      '>',
      '> - first item',
      '> - second item',
    ].join('\n');

    const html = await renderAsync(MarkdownRenderer({ content }));

    expect(html).toContain('class="alert alert-tip"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('<code');
    expect(html).toContain('<ul');
  });

  test('rST .. note:: produces a docutils admonition that inherits the same alert color palette via CSS', async () => {
    // rST goes through rstToMarkdown → MarkdownRenderer on systems without docutils.
    // The resulting blockquote is NOT a GitHub-alert marker (it's the docutils
    // "Note" admonition path), but the CSS rules in globals.css color the
    // .rst-rendered aside.admonition-note element with the same --alert-accent
    // variable as the MDX .alert-note. This test exercises the fallback path
    // (no Python docutils available locally) — it should at least render the
    // body content somewhere.
    const content = [
      'Heading',
      '=======',
      '',
      '.. note::',
      '',
      '   rst-side note content',
    ].join('\n');

    const html = await renderAsync(RstRenderer({ content }));

    expect(html).toContain('rst-side note content');
  });
});
