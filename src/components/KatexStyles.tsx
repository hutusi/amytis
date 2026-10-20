import katexPackage from 'katex/package.json';

/** Public URL of the vendored KaTeX stylesheet (scripts/copy-vendor-assets.ts). */
export const KATEX_STYLESHEET_HREF = `/vendor/katex/${katexPackage.version}/katex.min.css`;

/**
 * KaTeX's stylesheet, rendered by MarkdownRenderer/RstRenderer only when a
 * post has `latex: true`. It is a plain <link> to a vendored copy rather
 * than `import 'katex/dist/katex.min.css'`: any CSS import in the article
 * module graph — even behind next/dynamic — lands in the route's CSS and
 * becomes render-blocking on every article, math or not. React 19 hoists
 * the link into <head> (deduped by href via `precedence`), and on
 * client-side navigation holds the commit until it loads, so math never
 * flashes unstyled.
 */
export default function KatexStyles() {
  return <link rel="stylesheet" href={KATEX_STYLESHEET_HREF} precedence="katex" />;
}
