import { afterEach, describe, expect, mock, test } from 'bun:test';
import { render } from '@testing-library/react';
import { DisqusThread } from '@/components/Comments';

afterEach(() => {
  delete window.DISQUS;
  delete window.disqus_config;
  document.getElementById('disqus-embed')?.remove();
});

function applyConfig(config: (this: { page: { url: string; identifier: string } }) => void) {
  const ctx = { page: { url: '', identifier: '' } };
  config.call(ctx);
  return ctx.page;
}

describe('DisqusThread', () => {
  test('first mount injects embed.js once with the page config', () => {
    // happy-dom refuses to fetch the injected script and reports it through
    // console.error; the element itself is what this test asserts on.
    const originalError = console.error;
    console.error = mock(() => {});
    try {
      const { rerender } = render(<DisqusThread shortname="demo" url="https://x.test/a/" identifier="a" />);
      const script = document.getElementById('disqus-embed') as HTMLScriptElement;
      expect(script.src).toBe('https://demo.disqus.com/embed.js');
      expect(applyConfig(window.disqus_config!)).toEqual({ url: 'https://x.test/a/', identifier: 'a' });

      // Navigating before embed.js finished loading updates the config only.
      rerender(<DisqusThread shortname="demo" url="https://x.test/b/" identifier="b" />);
      expect(document.querySelectorAll('#disqus-embed').length).toBe(1);
      expect(applyConfig(window.disqus_config!)).toEqual({ url: 'https://x.test/b/', identifier: 'b' });
    } finally {
      console.error = originalError;
    }
  });

  test('client-side navigation with Disqus loaded resets the thread', () => {
    const reset = mock(() => {});
    window.DISQUS = { reset };
    render(<DisqusThread shortname="demo" url="https://x.test/c/" identifier="c" />);
    expect(reset).toHaveBeenCalledTimes(1);
    const [{ reload, config }] = reset.mock.calls[0] as unknown as [{ reload: boolean; config: (this: { page: { url: string; identifier: string } }) => void }];
    expect(reload).toBe(true);
    expect(applyConfig(config)).toEqual({ url: 'https://x.test/c/', identifier: 'c' });
    expect(document.getElementById('disqus-embed')).toBeNull();
  });
});
