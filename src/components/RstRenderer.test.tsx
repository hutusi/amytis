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
