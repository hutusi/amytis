import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import MetaDot from './MetaDot';

describe('MetaDot', () => {
  test('renders the dot separator classes', () => {
    const html = renderToStaticMarkup(<MetaDot />);
    expect(html).toContain('<span');
    expect(html).toContain('w-1');
    expect(html).toContain('h-1');
    expect(html).toContain('rounded-full');
    expect(html).toContain('bg-ink/[0.12]');
  });

  test('merges extra classes via className', () => {
    const html = renderToStaticMarkup(<MetaDot className="mx-2" />);
    expect(html).toContain('mx-2');
  });
});
