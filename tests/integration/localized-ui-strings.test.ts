import { describe, expect, test } from 'bun:test';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import CodeGroup from '@/components/CodeGroup';
import { renderAsync } from '@/test-utils/render';
import { createElement } from 'react';

const footnoted = 'Claim.[^1]\n\n[^1]: Source.';

describe('Integration: generated UI text follows the content locale', () => {
  test('GFM footnote heading and back links are localized', async () => {
    const zh = await renderAsync(MarkdownRenderer({ content: footnoted, locale: 'zh' }), { locale: 'zh' });
    expect(zh).toContain('脚注');
    expect(zh).toContain('aria-label="返回引用 1"');
    expect(zh).not.toContain('Back to reference');

    const en = await renderAsync(MarkdownRenderer({ content: footnoted }));
    expect(en).toContain('Footnotes');
    expect(en).toContain('aria-label="Back to reference 1"');
  });

  test('unlabeled code-group tabs get a translated fallback', async () => {
    const html = await renderAsync(
      createElement(CodeGroup, { 'data-group-id': 'g' }, createElement('pre', null, 'a'), createElement('pre', null, 'b')),
      { locale: 'zh' },
    );
    expect(html).toContain('标签 1');
    expect(html).toContain('标签 2');
    expect(html).not.toContain('Tab 1');
  });
});
