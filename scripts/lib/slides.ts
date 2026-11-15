import path from 'path';

// Pure helpers for scripts/new-slides.ts, kept apart so they're testable
// without spawning the script.

export const SLIDE_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'];

/** Formats the image optimizer serves as-is, with no smaller variants. */
const UNOPTIMIZED_EXTENSIONS = ['.webp', '.avif'];

export function isSlideImage(fileName: string): boolean {
  return !fileName.startsWith('.') && SLIDE_IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

export function isUnoptimizedImage(fileName: string): boolean {
  return UNOPTIMIZED_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Slide order from exported file names: numeric runs compare as numbers and
 * case is ignored, so Keynote's `Talk.001.png`… and PowerPoint's
 * `Slide1.PNG`, `Slide2.PNG`, … `Slide10.PNG` both come out in deck order.
 */
export function sortSlideFiles(fileNames: string[]): string[] {
  return [...fileNames].sort(collator.compare);
}

/**
 * The normalized name of slide `index` (0-based) in a deck of `total`:
 * `slide-01.png`, padded to at least two digits so names sort in order
 * everywhere, with a lowercase extension.
 */
export function slideFileName(index: number, total: number, extension: string): string {
  const width = Math.max(2, String(total).length);
  return `slide-${String(index + 1).padStart(width, '0')}${extension.toLowerCase()}`;
}

/**
 * Scale at which to render a PDF whose first page is `pageWidth` pixels wide
 * at scale 1, so slides come out about `targetWidth` wide. A fixed scale
 * suits no deck: Keynote pages are often 1920pt wide (scale 2 would write
 * 3840px PNGs into git), PowerPoint's 960pt.
 */
export function pdfRenderScale(pageWidth: number, targetWidth: number): number {
  if (!(pageWidth > 0) || !(targetWidth > 0)) return 1;
  return Math.min(4, Math.max(0.25, targetWidth / pageWidth));
}

const escapeLabel = (value: string) => value.replace(/\\/g, '\\\\').replace(/([[\]])/g, '\\$1');
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export interface SlidesBlockOptions {
  title?: string;
  /** Folder of the slide images, relative to the content file. */
  dir: string;
  files: string[];
  pdf?: string;
  video?: string;
}

/** The `:::slides` block for a deck (docs/SLIDES.md). */
export function formatSlidesBlock({ title, dir, files, pdf, video }: SlidesBlockOptions): string {
  const label = title ? `[${escapeLabel(title)}]` : '';
  const attributes = [
    pdf ? `pdf="${escapeAttribute(pdf)}"` : '',
    video ? `video="${escapeAttribute(video)}"` : '',
  ].filter(Boolean);
  const opener = `:::slides${label}${attributes.length ? `{${attributes.join(' ')}}` : ''}`;
  const images = files.map((file, i) => `![Slide ${i + 1}](./${dir}/${file})`);
  return [opener, ...images, ':::'].join('\n');
}
