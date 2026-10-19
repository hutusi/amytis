/**
 * Copies third-party static assets that pages reference by URL into
 * public/vendor/ — currently KaTeX's stylesheet and fonts, linked only by
 * pages that render math (see src/components/KatexStyles.tsx).
 *
 * The directory is versioned (public/vendor/katex/<version>/) so a KaTeX
 * upgrade changes every URL, and stale versions are removed. Runs before
 * `next dev` and as part of copy-assets in every build; idempotent and
 * cheap when the files are already in place.
 */
import fs from 'fs';
import path from 'path';
import katexPackage from 'katex/package.json';

export const KATEX_VERSION: string = katexPackage.version;

/** Copy KaTeX's dist stylesheet + fonts to <root>/public/vendor/katex/<version>/. */
export function copyKatexAssets(root: string = process.cwd()): string {
  const source = path.join(root, 'node_modules', 'katex', 'dist');
  const vendorRoot = path.join(root, 'public', 'vendor', 'katex');
  const target = path.join(vendorRoot, KATEX_VERSION);

  if (fs.existsSync(vendorRoot)) {
    for (const entry of fs.readdirSync(vendorRoot)) {
      if (entry !== KATEX_VERSION) fs.rmSync(path.join(vendorRoot, entry), { recursive: true, force: true });
    }
  }

  fs.mkdirSync(path.join(target, 'fonts'), { recursive: true });
  const copyIfChanged = (from: string, to: string) => {
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) return;
    fs.copyFileSync(from, to);
  };
  copyIfChanged(path.join(source, 'katex.min.css'), path.join(target, 'katex.min.css'));
  for (const font of fs.readdirSync(path.join(source, 'fonts'))) {
    copyIfChanged(path.join(source, 'fonts', font), path.join(target, 'fonts', font));
  }
  return target;
}

if (import.meta.main) {
  const target = copyKatexAssets();
  console.log(`Vendor assets ready: ${path.relative(process.cwd(), target)}`);
}
