import { describe, expect, test } from 'bun:test';
import robots from '@/app/robots';
import { siteConfig } from '../../site.config';

describe('Integration: robots.txt', () => {
  test('allows crawling and advertises the absolute sitemap URL', () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(result.sitemap).toBe(`${siteConfig.baseUrl.replace(/\/+$/, '')}/sitemap.xml`);
  });
});
