import { describe, expect, test } from 'bun:test';
import RedirectPage from './RedirectPage';
import { renderAsync } from '@/test-utils/render';

describe('RedirectPage', () => {
  test('redirects without JS via meta refresh and keeps the hash with JS', async () => {
    const html = await renderAsync(<RedirectPage to="/posts/new/" />);
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain('content="0;url=/posts/new/"');
    expect(html).toContain('location.replace("/posts/new/"+location.hash)');
    expect(html).toContain('href="/posts/new/"');
  });

  test('targets the canonical trailing-slash URL (no second redirect hop)', async () => {
    const html = await renderAsync(<RedirectPage to="/posts/new" />);
    expect(html).toContain('content="0;url=/posts/new/"');
    expect(html).toContain('location.replace("/posts/new/"+location.hash)');
  });

  test('is excluded from the search index', async () => {
    const html = await renderAsync(<RedirectPage to="/x/" />);
    expect(html).toContain('data-pagefind-ignore="all"');
  });

  test('escapes the target so it cannot close the inline script', async () => {
    const html = await renderAsync(<RedirectPage to={'/a</script><script>alert(1)//'} />);
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('\\u003c/script>');
  });

  test('shows translated fallback text', async () => {
    expect(await renderAsync(<RedirectPage to="/x/" />, { locale: 'zh' })).toContain('此页面已迁移。');
  });
});
