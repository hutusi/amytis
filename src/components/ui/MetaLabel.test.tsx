import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import MetaLabel from './MetaLabel';

describe('MetaLabel', () => {
  test('renders a span with the micro-label base classes and muted tone by default', () => {
    const html = renderToStaticMarkup(<MetaLabel>Tags</MetaLabel>);
    expect(html).toContain('<span');
    expect(html).toContain('text-[10px]');
    expect(html).toContain('font-sans');
    expect(html).toContain('font-bold');
    expect(html).toContain('uppercase');
    expect(html).toContain('tracking-widest');
    expect(html).toContain('text-muted');
    expect(html).toContain('Tags');
  });

  test('accent tone swaps the color', () => {
    const html = renderToStaticMarkup(<MetaLabel tone="accent">Series</MetaLabel>);
    expect(html).toContain('text-accent');
    expect(html).not.toContain('text-muted');
  });

  test('honors the polymorphic `as` element', () => {
    const html = renderToStaticMarkup(<MetaLabel as="p">Label</MetaLabel>);
    expect(html).toContain('<p');
    expect(html).not.toContain('<span');
  });

  test('merges extra classes via className', () => {
    const html = renderToStaticMarkup(<MetaLabel className="mb-3 flex items-center gap-1.5">X</MetaLabel>);
    expect(html).toContain('mb-3');
    expect(html).toContain('items-center');
  });
});
