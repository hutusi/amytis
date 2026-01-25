import { visit } from 'unist-util-visit';
import sizeOf from 'image-size';
import path from 'path';
import fs from 'fs';

interface Options {
  slug?: string;
}

export default function rehypeImageMetadata(options: Options) {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName === 'img' && node.properties && typeof node.properties.src === 'string') {
        const src = node.properties.src as string;
        
        if (src.startsWith('http')) return;

        let imagePath = '';
        let publicPath = '';

        if (src.startsWith('./') && options.slug) {
          // Relative path in post
          // e.g. ./assets/image.svg -> public/posts/slug/assets/image.svg
          // Remove ./
          const relative = src.substring(2);
          imagePath = path.join(process.cwd(), 'public', 'posts', options.slug, relative);
          publicPath = `/posts/${options.slug}/${relative}`;
        } else if (src.startsWith('/')) {
          // Absolute path from public
          imagePath = path.join(process.cwd(), 'public', src);
          publicPath = src;
        } else {
          return;
        }

        try {
          if (fs.existsSync(imagePath)) {
            const buffer = fs.readFileSync(imagePath);
            const dimensions = sizeOf(buffer);
            if (dimensions) {
              node.properties.width = dimensions.width;
              node.properties.height = dimensions.height;
              node.properties.src = publicPath; // Rewrite to public URL
            }
          }
        } catch (e) {
          console.warn(`Failed to get dimensions for ${imagePath}`, e);
        }
      }
    });
  };
}
