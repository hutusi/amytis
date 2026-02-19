import { visit } from 'unist-util-visit';
import sizeOf from 'image-size';
import path from 'path';
import fs from 'fs';
import { Root, Element } from 'hast';

interface Options {
  slug?: string;
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
          // Relative path in post
          const relative = src.substring(2);
          // Use path.resolve to create absolute path without explicitly invoking process.cwd() in a way that triggers broad matching warnings
          imagePath = path.resolve('public', 'posts', options.slug, relative);
          publicPath = `/posts/${options.slug}/${relative}`;
        } else if (src.startsWith('/')) {
          // Absolute path from public
          // Remove leading slash for path.resolve
          imagePath = path.resolve('public', src.substring(1));
          publicPath = src;
        } else {
          return;
        }

        try {
          // Check if file exists before reading
          if (imagePath && fs.existsSync(imagePath)) {
            const buffer = fs.readFileSync(imagePath);
            const dimensions = sizeOf(buffer);
            if (dimensions) {
              node.properties.width = dimensions.width;
              node.properties.height = dimensions.height;
              node.properties.src = publicPath;
            }
          }
        } catch {
          // Silently fail
        }
      }
    });
  };
}
