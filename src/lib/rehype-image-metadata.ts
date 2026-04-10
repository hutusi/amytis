import { visit } from 'unist-util-visit';
import sizeOf from 'image-size';
import path from 'path';
import fs from 'fs';
import { Root, Element } from 'hast';
import { getCdnImageUrl } from './image-utils';

interface Options {
  slug?: string;
  cdnBaseUrl?: string;
}

export default function rehypeImageMetadata(options: Options) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img' && node.properties && typeof node.properties.src === 'string') {
        const src = node.properties.src as string;
        
        if (src.startsWith('http')) return;

        let imagePath = '';
        let publicPath = '';

        if (src.startsWith('./') && options.slug) {
          // Relative path: slug is the full public-relative base path (e.g. posts/my-post, books/my-book, flows/2026/01/15)
          const relative = src.substring(2);
          // Use path.resolve to create absolute path without explicitly invoking process.cwd() in a way that triggers broad matching warnings
          imagePath = path.resolve('public', options.slug, relative);
          publicPath = `/${options.slug}/${relative}`;
        } else if (
          options.slug &&
          !src.startsWith('/') &&
          !src.startsWith('../') &&
          !src.startsWith('data:') &&
          !src.startsWith('#')
        ) {
          // Bare relative path (e.g. assets/image.png): resolve against the content slug root.
          imagePath = path.resolve('public', options.slug, src);
          publicPath = `/${options.slug}/${src}`;
        } else if (src.startsWith('/')) {
          // Absolute path from public
          // Remove leading slash for path.resolve
          imagePath = path.resolve('public', src.substring(1));
          publicPath = src;
        } else {
          return;
        }

        // Always resolve to the public path (and apply CDN prefix if configured).
        // Path resolution must happen regardless of whether the file exists locally,
        // so that images hosted only on CDN still get the correct URL.
        node.properties.src = getCdnImageUrl(publicPath, options.cdnBaseUrl ?? '');

        // Enrich with dimensions only when the file is available locally
        try {
          if (imagePath && fs.existsSync(/* turbopackIgnore: true */ imagePath)) {
            const buffer = fs.readFileSync(/* turbopackIgnore: true */ imagePath);
            const dimensions = sizeOf(buffer);
            if (dimensions) {
              node.properties.width = dimensions.width;
              node.properties.height = dimensions.height;
            }
          }
        } catch {
          // Silently fail
        }
      }
    });
  };
}
