import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { renderAsync } from '@/test-utils/render';

// MarkdownRenderer ships each KaTeX formula as one pre-serialized HTML
// string (see the `span` override). The markup must stay exactly what
// rehype-katex produces: HTML rendering + MathML twin with the TeX source.
describe('Integration: KaTeX rendering', () => {
  test('display math keeps the katex-display > katex > MathML structure', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: '$$\n\\frac{a}{b}\n$$', latex: true }));
    expect(html).toMatch(/<span class="katex-display"><span class="katex"><span class="katex-mathml"><math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML" display="block">/);
    expect(html).toContain('<annotation encoding="application/x-tex">\\frac{a}{b}</annotation>');
    expect(html).toContain('<span class="katex-html" aria-hidden="true">');
  });

  test('inline math renders inside the paragraph', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: 'Euler: $e^{i\\pi}+1=0$ holds.', latex: true }));
    expect(html).toMatch(/Euler: <span class="katex"><span class="katex-mathml"><math/);
    expect(html).toContain('holds.');
  });

  test('SVG glyphs (sqrt) survive serialization in the SVG namespace', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: '$\\sqrt{x}$', latex: true }));
    expect(html).toMatch(/<svg[^>]*viewBox="[^"]+"/);
    expect(html).toContain('<path d="');
  });

  test('plain spans outside math still render as React children', async () => {
    const html = await renderAsync(MarkdownRenderer({ content: 'a <span class="note">b</span> c', latex: true }));
    expect(html).toContain('<span class="note">b</span>');
  });
});
