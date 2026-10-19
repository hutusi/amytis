import { visit } from 'unist-util-visit';
import sizeOf from 'image-size';
import path from 'path';
import fs from 'fs';
import { Root, Element } from 'hast';
import { getCdnImageUrl, resolveContentImagePath } from './image-utils';

interface Options {
  slug?: string;
  cdnBaseUrl?: string;
}

export default function rehypeImageMetadata(options: Options) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'img' && node.properties && typeof node.properties.src === 'string') {
        const src = node.properties.src as string;
        
        // Path resolution is shared with feed rendering (resolveContentImagePath)
        // so a co-located image points at the same file on both surfaces.
        const publicPath = resolveContentImagePath(src, options.slug);
        if (!publicPath) return;
        // Use path.resolve to create absolute path without explicitly invoking process.cwd() in a way that triggers broad matching warnings
        const imagePath = path.resolve('public', publicPath.substring(1));

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
