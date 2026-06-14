import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import SectionHeading from './SectionHeading';

describe('SectionHeading', () => {
  test('renders an h2 with the serif section-heading classes by default', () => {
    const html = renderToStaticMarkup(<SectionHeading>Featured</SectionHeading>);
    expect(html).toContain('<h2');
    expect(html).toContain('text-2xl');
    expect(html).toContain('sm:text-3xl');
    expect(html).toContain('font-serif');
    expect(html).toContain('font-bold');
    expect(html).toContain('text-heading');
    expect(html).toContain('Featured');
  });

  test('honors the `as` element', () => {
    const html = renderToStaticMarkup(<SectionHeading as="h3">Related</SectionHeading>);
    expect(html).toContain('<h3');
    expect(html).not.toContain('<h2');
  });

  test('merges extra classes via className', () => {
    const html = renderToStaticMarkup(<SectionHeading className="mb-8">X</SectionHeading>);
    expect(html).toContain('mb-8');
  });
});
