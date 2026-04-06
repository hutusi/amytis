import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import RstRenderer from './RstRenderer';

describe('RstRenderer', () => {
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
    expect(html).toContain('Copy');
  });
});
