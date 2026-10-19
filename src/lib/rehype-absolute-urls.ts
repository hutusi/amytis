import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import { getCdnImageUrl, resolveContentImagePath } from './image-utils';

export interface AbsoluteUrlsOptions {
  /** Absolute URL of the page the HTML belongs to (trailing-slash form). */
  pageUrl: string;
  /** Site origin + base path, no trailing slash (e.g. `https://example.com`). */
  siteUrl: string;
  /**
   * Public-relative asset base of the content (`posts/my-post`,
   * `flows/2026/01/15`). Co-located `<img>` paths resolve against it exactly
   * as they do on the page — NOT against `pageUrl`, which differs for series
   * posts on autoPaths/customPaths URLs and for flat root posts.
   */
  imageBaseSlug?: string;
  cdnBaseUrl?: string;
}

const URL_ATTRS = ['src', 'href', 'poster'] as const;
const SKIP_URL_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function absolutize(url: string, base: string): string {
  if (url === '' || SKIP_URL_RE.test(url)) return url;
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/**
 * Feed readers resolve nothing relative, so rewrite every URL-bearing
 * attribute to an absolute URL. Works on the HAST tree, not on serialized
 * HTML, so text that merely looks like `src="…"` (code samples) is never
 * touched. `<img src>` goes through the same resolver as the on-page image
 * pipeline (plus the CDN prefix); every other URL resolves against the page
 * URL, which ends in '/' so `images/x.png` resolves as it does in a browser.
 */
export default function rehypeAbsoluteUrls(options: AbsoluteUrlsOptions) {
  const { pageUrl, siteUrl, imageBaseSlug, cdnBaseUrl = '' } = options;
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const props = node.properties;
      if (!props) return;
      for (const attr of URL_ATTRS) {
        const value = props[attr];
        if (typeof value !== 'string') continue;
        if (node.tagName === 'img' && attr === 'src') {
          const publicPath = resolveContentImagePath(value, imageBaseSlug);
          if (publicPath) {
            const resolved = getCdnImageUrl(publicPath, cdnBaseUrl);
            props[attr] = resolved.startsWith('/') ? `${siteUrl}${resolved}` : resolved;
            continue;
          }
        }
        props[attr] = absolutize(value, pageUrl);
      }
      const srcSet = props.srcSet;
      if (typeof srcSet === 'string' || Array.isArray(srcSet)) {
        const candidates = Array.isArray(srcSet) ? srcSet.map(String) : srcSet.split(',');
        props.srcSet = candidates
          .map((candidate) => {
            const [url, ...descriptor] = candidate.trim().split(/\s+/);
            return [absolutize(url, pageUrl), ...descriptor].join(' ');
          })
          .join(', ');
      }
    });
  };
}
