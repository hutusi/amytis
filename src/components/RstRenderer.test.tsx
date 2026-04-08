import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import RstRenderer from './RstRenderer';

describe('RstRenderer', () => {
  test('renders pre-rendered html when available', () => {
    const html = renderToStaticMarkup(
      <RstRenderer
        content="Fallback body"
        html={
          '<section><h2 id="intro">Intro</h2><figure class="docutils"><img src="/posts/demo/test.png" alt="Test" onerror="alert(2)" /><figcaption>Caption</figcaption></figure><aside class="admonition note"><p class="admonition-title">Note</p><p>Keep me</p></aside><p><a href="/demo" onclick="alert(3)">Link</a></p><p><a href="javascript:alert(4)">Bad link</a></p><script>alert(1)</script><iframe src="https://example.com/embed"></iframe></section>'
        }
      />
    );

    expect(html).toContain('rst-rendered');
    expect(html).toContain('id="intro"');
    expect(html).toContain('<figure');
    expect(html).toContain('<figcaption>Caption</figcaption>');
    expect(html).toContain('admonition-title');
    expect(html).toContain('/posts/demo/test.png');
    expect(html).toContain('href="/demo"');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:alert(4)');
  });

  test('blocks data urls on images', () => {
    const html = renderToStaticMarkup(
      <RstRenderer
        content="Fallback body"
        html={'<p><img src="data:image/svg+xml,<svg onload=alert(1)>" alt="Bad" /></p>'}
      />
    );

    expect(html).toContain('<img');
    expect(html).not.toContain('data:image');
  });

  test('preserves MathML elements', () => {
    const html = renderToStaticMarkup(
      <RstRenderer
        content="Fallback body"
        html={'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>x</mi><mo>=</mo><mn>2</mn></mrow></math>'}
      />
    );

    expect(html).toContain('<math');
    expect(html).toContain('<mrow');
    expect(html).toContain('<mi>x</mi>');
  });

  test('wraps rendered rst tables with the same scroll container pattern as markdown', () => {
    const html = renderToStaticMarkup(
      <RstRenderer
        content="Fallback body"
        html={'<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>'}
      />
    );

    expect(html).toContain('class="rst-table-wrapper"');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>B</td>');
  });

  test('renders converted headings, links, and code blocks through the markdown renderer', () => {
    const html = renderToStaticMarkup(
      <RstRenderer
        content={[
          'Section',
          '-------',
          '',
          'Paragraph with `Example <https://example.com>`_.',
          '',
          '.. code-block:: ts',
          '',
          '  export const value = 1;',
        ].join('\n')}
      />
    );

    expect(html).toContain('Section');
    expect(html).toContain('https://example.com');
    expect(html).toContain('language-ts');
    expect(html).toContain('<code class="language-ts"');
    expect(html).toContain('token keyword');
    expect(html).toContain('token number');
  });
});
