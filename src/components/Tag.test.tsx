import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import Tag from './Tag';

describe('Tag', () => {
  test('default variant renders a hashed pill link', () => {
    const html = renderToStaticMarkup(<Tag tag="React" />);
    expect(html).toContain('href="/tags/react"');
    expect(html).toContain('#React');
    expect(html).toContain('rounded-full');
  });

  test('pill variant drops the hash and applies pill classes + passthrough className', () => {
    const html = renderToStaticMarkup(<Tag tag="React" variant="pill" className="relative z-10" />);
    expect(html).toContain('href="/tags/react"');
    expect(html).not.toContain('#React');
    expect(html).toContain('React');
    expect(html).toContain('text-muted/70');
    expect(html).toContain('relative');
    expect(html).toContain('z-10');
  });

  test('href encodes special characters in the lowercased tag', () => {
    const html = renderToStaticMarkup(<Tag tag="C#" variant="pill" />);
    expect(html).toContain('href="/tags/c%23"');
    expect(html).not.toContain('/tags/c#');
  });

  test('large variant shows the optional count', () => {
    const html = renderToStaticMarkup(<Tag tag="React" variant="large" count={7} />);
    expect(html).toContain('React');
    expect(html).toContain('7');
  });
});
