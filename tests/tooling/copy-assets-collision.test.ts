import { describe, test, expect, beforeEach } from 'bun:test';
import { claimAssetDir, resetAssetClaims } from '../../scripts/copy-assets';

// The guard forbids two distinct posts writing assets to one bare-slug
// directory (public/posts/<slug>), which duplicate slugs across series share.
describe('copy-assets duplicate-slug asset guard', () => {
  beforeEach(() => resetAssetClaims());

  test('throws when a second source targets a dir a prior source filled with assets', () => {
    claimAssetDir('/pub/posts/dup', 'series/a/dup', true);
    expect(() => claimAssetDir('/pub/posts/dup', 'series/b/dup', true)).toThrow(/collision/);
  });

  test('throws even when the second source has no assets (its prune would wipe the first)', () => {
    claimAssetDir('/pub/posts/dup', 'series/a/dup', true);
    expect(() => claimAssetDir('/pub/posts/dup', 'series/b/dup', false)).toThrow(/collision/);
  });

  test('allows duplicate slugs when neither post has assets (the rst-toctree case)', () => {
    claimAssetDir('/pub/posts/first-post', 'series/rst-toctree/first-post', false);
    expect(() => claimAssetDir('/pub/posts/first-post', 'series/rst-toctree-precedence/first-post', false)).not.toThrow();
  });

  test('allows a later asset-bearing source when the prior claimant contributed none', () => {
    claimAssetDir('/pub/posts/x', 'series/a/x', false);
    expect(() => claimAssetDir('/pub/posts/x', 'series/b/x', true)).not.toThrow();
  });

  test('the same source re-claiming its own directory never throws', () => {
    claimAssetDir('/pub/posts/y', 'series/a/y', true);
    expect(() => claimAssetDir('/pub/posts/y', 'series/a/y', true)).not.toThrow();
  });

  test('distinct directories never collide', () => {
    claimAssetDir('/pub/posts/a', 'series/s/a', true);
    expect(() => claimAssetDir('/pub/posts/b', 'series/s/b', true)).not.toThrow();
  });
});
