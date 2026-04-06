import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import RstRenderer from './RstRenderer';

describe('RstRenderer', () => {
  test('renders pre-rendered html when available', () => {
    const html = renderToStaticMarkup(
      <RstRenderer
        content="Fallback body"
        html={'<section><h2 id="intro">Intro</h2><p><img src="/posts/demo/test.png" alt="Test" /></p><script>alert(1)</script></section>'}
      />
    );

    expect(html).toContain('id="intro"');
    expect(html).toContain('/posts/demo/test.png');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('<script');
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
