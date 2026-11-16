import { describe, test, expect } from 'bun:test';
import rehypeImageMetadata from './rehype-image-metadata';
import type { Root, Element } from 'hast';

/** Build a minimal HAST tree containing a single <img> node. */
function makeTree(src: string): Root {
  return {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'img',
        properties: { src },
        children: [],
      } satisfies Element,
    ],
  };
}

function imgSrc(tree: Root): unknown {
  return (tree.children[0] as Element).properties.src;
}

describe('rehype-image-metadata', () => {
  describe('relative paths (./)', () => {
    test('resolves to posts public path when slug is posts/{slug}', () => {
      const tree = makeTree('./images/photo.png');
      rehypeImageMetadata({ slug: 'posts/my-post' })(tree);
      expect(imgSrc(tree)).toBe('/posts/my-post/images/photo.png');
    });

    test('resolves to books public path when slug is books/{slug}', () => {
      const tree = makeTree('./images/cover.jpg');
      rehypeImageMetadata({ slug: 'books/my-book' })(tree);
      expect(imgSrc(tree)).toBe('/books/my-book/images/cover.jpg');
    });

    test('resolves to flows public path when slug is flows/{year}/{month}/{day}', () => {
      const tree = makeTree('./images/snap.jpg');
      rehypeImageMetadata({ slug: 'flows/2026/01/15' })(tree);
      expect(imgSrc(tree)).toBe('/flows/2026/01/15/images/snap.jpg');
    });

    test('resolves to notes public path when slug is notes/{slug}', () => {
      const tree = makeTree('./images/diagram.svg');
      rehypeImageMetadata({ slug: 'notes/my-note' })(tree);
      expect(imgSrc(tree)).toBe('/notes/my-note/images/diagram.svg');
    });

    test('does not modify src when no slug is provided', () => {
      const tree = makeTree('./images/photo.png');
      rehypeImageMetadata({})(tree);
      expect(imgSrc(tree)).toBe('./images/photo.png');
    });

    test('handles nested relative paths correctly', () => {
      const tree = makeTree('./assets/sub/image.webp');
      rehypeImageMetadata({ slug: 'posts/my-post' })(tree);
      expect(imgSrc(tree)).toBe('/posts/my-post/assets/sub/image.webp');
    });
  });

  describe('absolute paths (/)', () => {
    test('keeps absolute paths as-is', () => {
      const tree = makeTree('/static/logo.png');
      rehypeImageMetadata({ slug: 'posts/my-post' })(tree);
      expect(imgSrc(tree)).toBe('/static/logo.png');
    });

    test('resolves absolute path without slug', () => {
      const tree = makeTree('/images/banner.png');
      rehypeImageMetadata({})(tree);
      expect(imgSrc(tree)).toBe('/images/banner.png');
    });
  });

  describe('external URLs', () => {
    test('does not touch http:// URLs', () => {
      const tree = makeTree('https://example.com/image.png');
      rehypeImageMetadata({ slug: 'posts/my-post' })(tree);
      expect(imgSrc(tree)).toBe('https://example.com/image.png');
    });

    test('does not touch // protocol-relative URLs', () => {
      const tree = makeTree('//cdn.example.com/image.png');
      rehypeImageMetadata({ slug: 'posts/my-post' })(tree);
      expect(imgSrc(tree)).toBe('//cdn.example.com/image.png');
    });
  });

  describe('bare relative paths (no prefix)', () => {
    test('resolves bare relative paths against slug', () => {
      const tree = makeTree('images/photo.png');
      rehypeImageMetadata({ slug: 'posts/my-post' })(tree);
      expect(imgSrc(tree)).toBe('/posts/my-post/images/photo.png');
    });

    test('keeps bare relative paths when no slug is provided', () => {
      const tree = makeTree('images/photo.png');
      rehypeImageMetadata({})(tree);
      expect(imgSrc(tree)).toBe('images/photo.png');
    });
  });

  describe('query and fragment', () => {
    test('keeps them as written and never measures a file through them', () => {
      // Read as a file path, the query would step out of public/ to a real
      // SVG in the repo (content/posts/multimedia-showcase/slides/).
      const src = './a.png?x=/../../../../content/posts/multimedia-showcase/slides/slide-01.svg';
      const tree = makeTree(src);
      rehypeImageMetadata({ slug: 'posts/x' })(tree);
      const props = (tree.children[0] as Element).properties;
      expect(props.src).toBe('/posts/x/a.png?x=/../../../../content/posts/multimedia-showcase/slides/slide-01.svg');
      expect(props.width).toBeUndefined();
    });
  });

  describe('CDN prefix', () => {
    test('prepends CDN base URL to resolved relative path', () => {
      const tree = makeTree('./images/photo.png');
      rehypeImageMetadata({ slug: 'posts/my-post', cdnBaseUrl: 'https://cdn.example.com' })(tree);
      expect(imgSrc(tree)).toBe('https://cdn.example.com/posts/my-post/images/photo.png');
    });

    test('prepends CDN base URL to absolute path', () => {
      const tree = makeTree('/static/logo.png');
      rehypeImageMetadata({ cdnBaseUrl: 'https://cdn.example.com' })(tree);
      expect(imgSrc(tree)).toBe('https://cdn.example.com/static/logo.png');
    });

    test('does not prepend CDN to external URLs', () => {
      const tree = makeTree('https://external.com/img.png');
      rehypeImageMetadata({ cdnBaseUrl: 'https://cdn.example.com' })(tree);
      expect(imgSrc(tree)).toBe('https://external.com/img.png');
    });
  });
});
