import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  getRstRendererCodeHashForTests,
  getRstRendererDiskCacheVersionForTests,
  getRstRendererDiskCachePathForTests,
  getPythonCommandSpecForRstRenderer,
  loadRenderedRstDocumentFromDiskCacheForTests,
} from './rst-renderer';

/**
 * Non-gated guard for the `rendererHash` cache key. The round-trip test in
 * rst-renderer.test.ts covers acceptance but skips without a local docutils
 * venv (e.g. in CI). A cache entry whose rendererHash doesn't match the current
 * scripts/render-rst.py must be a miss, so a renderer-code change
 * auto-invalidates the disk cache without a manual cache-version bump.
 */
describe('rst disk cache: rendererHash invalidation', () => {
  test('getRstRendererCodeHash is the sha1 of scripts/render-rst.py', () => {
    const expected = createHash('sha1')
      .update(fs.readFileSync(path.join(process.cwd(), 'scripts', 'render-rst.py')))
      .digest('hex');
    expect(getRstRendererCodeHashForTests()).toBe(expected);
  });

  test('a stale rendererHash is a miss; a matching one is a hit', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-rst-cache-'));
    const rstPath = path.join(dir, 'doc.rst');
    fs.writeFileSync(rstPath, 'Title\n=====\n\nbody\n', 'utf8');
    const slug = 'cache-test-slug';

    // Build an entry that matches the loader's other checks by construction, so
    // the rendererHash is the only field under test.
    const baseEntry = {
      version: getRstRendererDiskCacheVersionForTests(),
      sourceHash: createHash('sha1').update(fs.readFileSync(rstPath)).digest('hex'),
      imageBaseSlug: slug,
      pythonCacheKey: getPythonCommandSpecForRstRenderer().cacheKey,
      rendered: { html: '<p>cached</p>' },
    };
    const cachePath = getRstRendererDiskCachePathForTests(rstPath);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });

    try {
      fs.writeFileSync(cachePath, JSON.stringify({ ...baseEntry, rendererHash: getRstRendererCodeHashForTests() }));
      expect(loadRenderedRstDocumentFromDiskCacheForTests(rstPath, slug)).not.toBeNull();

      fs.writeFileSync(cachePath, JSON.stringify({ ...baseEntry, rendererHash: 'stale-renderer-hash' }));
      expect(loadRenderedRstDocumentFromDiskCacheForTests(rstPath, slug)).toBeNull();
    } finally {
      fs.rmSync(cachePath, { force: true });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
