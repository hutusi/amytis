import { afterEach, describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import GlobalError from '@/app/global-error';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('global-error', () => {
  test('a zh page keeps the reader in zh: translated text and a /zh/ home link', () => {
    window.history.replaceState(null, '', '/zh/posts/x/');
    const html = renderToStaticMarkup(<GlobalError error={new Error('boom')} reset={() => {}} />);
    expect(html).toContain('<html lang="zh">');
    expect(html).toContain('href="/zh/"');
    expect(html).toContain('出错了');
  });

  test('default-locale pages link home at /', () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error('boom')} reset={() => {}} />);
    expect(html).toContain('href="/"');
  });
});
