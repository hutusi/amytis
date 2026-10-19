import { describe, expect, test } from "bun:test";
import { getCdnImageUrl, resolveContentImagePath, shouldBypassImageOptimization } from "./image-utils";

describe("image-utils", () => {
  test("getCdnImageUrl leaves external and special URLs unchanged", () => {
    expect(getCdnImageUrl("https://example.com/image.jpg", "https://cdn.example.com")).toBe("https://example.com/image.jpg");
    expect(getCdnImageUrl("text:Cover", "https://cdn.example.com")).toBe("text:Cover");
    expect(getCdnImageUrl("data:image/png;base64,abc", "https://cdn.example.com")).toBe("data:image/png;base64,abc");
  });

  test("shouldBypassImageOptimization skips avif and webp sources", () => {
    expect(shouldBypassImageOptimization("/images/background-new-wave.avif")).toBe(true);
    expect(shouldBypassImageOptimization("/images/already-optimized.webp")).toBe(true);
    expect(shouldBypassImageOptimization("/images/already-optimized.WEBP?version=1")).toBe(true);
    expect(shouldBypassImageOptimization("/images/already-optimized.webp?version=1#hero")).toBe(true);
    expect(shouldBypassImageOptimization("/images/photo.jpg")).toBe(false);
    expect(shouldBypassImageOptimization("/images/photo.png#fragment")).toBe(false);
  });
});

describe('resolveContentImagePath', () => {
  test('resolves ./ and bare relative paths against the asset base', () => {
    expect(resolveContentImagePath('./images/a.png', 'posts/my-post')).toBe('/posts/my-post/images/a.png');
    expect(resolveContentImagePath('assets/a.png', 'flows/2026/01/15')).toBe('/flows/2026/01/15/assets/a.png');
  });

  test('keeps site-absolute paths', () => {
    expect(resolveContentImagePath('/images/a.png', 'posts/x')).toBe('/images/a.png');
    expect(resolveContentImagePath('/images/a.png')).toBe('/images/a.png');
  });

  test('returns null for non-local sources', () => {
    for (const src of ['https://x.test/a.png', '//cdn.test/a.png', 'data:image/png;base64,AA', '#frag', '../escape.png', './../../../../private.png', 'images/../../other-post/a.png', '/../etc/passwd', '..\\other-post\\a.png', '.\\..\\x.png', 'HTTPS://example.test/a.png', 'Data:image/png;base64,AA', '']) {
      expect(resolveContentImagePath(src, 'posts/x')).toBeNull();
    }
    // Relative paths need an asset base to resolve against.
    expect(resolveContentImagePath('./a.png')).toBeNull();
    expect(resolveContentImagePath('a.png')).toBeNull();
  });

  test('normalizes dot segments that stay inside their root', () => {
    expect(resolveContentImagePath('./images/../a.png', 'posts/x')).toBe('/posts/x/a.png');
    expect(resolveContentImagePath('/images/./a.png', 'posts/x')).toBe('/images/a.png');
  });

  test('treats backslashes as separators and keeps http-prefixed local filenames', () => {
    expect(resolveContentImagePath('images\\a.png', 'posts/x')).toBe('/posts/x/images/a.png');
    expect(resolveContentImagePath('http-flow.png', 'posts/x')).toBe('/posts/x/http-flow.png');
  });
});
