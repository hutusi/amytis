import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import { MEDIA_SRC_TAGS, getCdnImageUrl, resolveContentImagePath } from './image-utils';

interface Options {
  slug?: string;
  cdnBaseUrl?: string;
}

/**
 * Raw-HTML media (`<video>`, `<audio>` and their `<source>`/`<track>`) point
 * at co-located files the way images do, so `./clip.mp4` resolves against the
 * content's asset base, as rehype-image-metadata does for `<img>`. Left
 * relative, the browser resolves it against the page URL, which breaks
 * wherever the content renders away from its folder: the flow stream, and
 * series posts on autoPaths/customPaths URLs. A `poster` is an image, so it
 * also takes the CDN prefix; media files stay on this site.
 */
export default function rehypeMediaPaths({ slug, cdnBaseUrl = '' }: Options) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties;
      if (MEDIA_SRC_TAGS.has(node.tagName) && typeof props.src === 'string') {
        props.src = resolveContentImagePath(props.src, slug) ?? props.src;
      }
      if (node.tagName === 'video' && typeof props.poster === 'string') {
        const publicPath = resolveContentImagePath(props.poster, slug);
        if (publicPath) props.poster = getCdnImageUrl(publicPath, cdnBaseUrl);
      }
    });
  };
}
