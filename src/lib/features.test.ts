import { describe, expect, test } from 'bun:test';
import { isEnabledIn, isFeatureEnabled } from './features';
import { siteConfig } from '../../site.config';

describe('features', () => {
  test('default-on: missing config means enabled', () => {
    expect(isEnabledIn(undefined, 'posts')).toBe(true);
    expect(isEnabledIn({}, 'posts')).toBe(true);
    expect(isEnabledIn({ posts: {} }, 'posts')).toBe(true);
    expect(isEnabledIn({ posts: undefined }, 'posts')).toBe(true);
  });

  test('only an explicit enabled:false disables', () => {
    expect(isEnabledIn({ flow: { enabled: false } }, 'flow')).toBe(false);
    expect(isEnabledIn({ flow: { enabled: true } }, 'flow')).toBe(true);
  });

  test('isFeatureEnabled reflects the live site config', () => {
    for (const key of Object.keys(siteConfig.features) as Array<keyof typeof siteConfig.features>) {
      expect(isFeatureEnabled(key)).toBe(siteConfig.features?.[key]?.enabled !== false);
    }
  });
});
