import fs from 'fs';
import path from 'path';
import {
  formatSlidesBlock,
  isSlideImage,
  isUnoptimizedImage,
  pdfRenderScale,
  slideFileName,
  sortSlideFiles,
} from './lib/slides';

const USAGE = `Usage: bun run new-slides <export-folder | deck.pdf> --into <content-folder> [options]

Copies a talk's slides next to a post or flow entry and prints the
:::slides block to paste into it (docs/SLIDES.md).

  <export-folder>   Slides exported as images (Keynote, PowerPoint, Google Slides)
  <deck.pdf>        A PDF export: each page becomes a PNG slide, and the PDF is
                    copied too and linked as the deck's download

Options:
  --into <folder>   The content folder, e.g. content/posts/my-talk/ or
                    content/flows/2026/11/15/ (required)
  --title "Title"   Deck title (default: the PDF's title, if any)
  --dir <name>      Subfolder for the images (default: slides)
  --pdf <file>      A PDF to copy next to the content and link as the download
  --video <url>     Link to the talk recording
  --width <px>      PDF input: render pages about this wide (default: 1920)
  --force           Replace existing slides`;

const args = process.argv.slice(2);
const VALUE_OPTIONS = new Set(['--into', '--title', '--dir', '--pdf', '--video', '--width']);

function option(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : undefined;
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const source = args.find((arg, i) => !arg.startsWith('--') && !VALUE_OPTIONS.has(args[i - 1] ?? ''));
const into = option('into');
const force = args.includes('--force');
const dir = option('dir') ?? 'slides';
const video = option('video');
const width = Number(option('width') ?? 1920);

if (!source || !into) {
  console.error(USAGE);
  process.exit(1);
}
if (!fs.existsSync(source)) fail(`"${source}" does not exist.`);
if (!fs.existsSync(into) || !fs.statSync(into).isDirectory()) {
  if (/\.mdx?$/i.test(into)) {
    fail(
      `--into must be a folder. Slides live next to the content, so turn "${into}" into a folder ` +
      '(my-talk.md → my-talk/index.md, or a flow DD.md → DD/index.md) and pass that folder.',
    );
  }
  fail(`--into "${into}" is not an existing folder.`);
}
if (!/^[\w.-]+$/.test(dir) || dir === '.' || dir === '..') fail(`--dir "${dir}" must be a plain folder name.`);
if (!(width > 0)) fail('--width must be a positive number of pixels.');

const slidesDir = path.join(into, dir);
if (fs.existsSync(slidesDir) && fs.readdirSync(slidesDir).length > 0 && !force) {
  fail(`${slidesDir} already has files. Pass --force to replace them.`);
}

/** Copies a PDF next to the content; returns its link for the block. */
function copyPdf(pdfPath: string): string {
  const name = path.basename(pdfPath);
  const target = path.join(into!, name);
  if (path.resolve(pdfPath) !== path.resolve(target)) {
    if (fs.existsSync(target) && !force) fail(`${target} already exists. Pass --force to replace it.`);
    fs.copyFileSync(pdfPath, target);
  }
  return `./${name}`;
}

function resetSlidesDir() {
  fs.rmSync(slidesDir, { recursive: true, force: true });
  fs.mkdirSync(slidesDir, { recursive: true });
}

let title = option('title');
let pdfLink: string | undefined;
const written: string[] = [];

if (fs.statSync(source).isDirectory()) {
  const images = sortSlideFiles(fs.readdirSync(source).filter((name) => isSlideImage(name) && fs.statSync(path.join(source, name)).isFile()));
  if (images.length === 0) fail(`No slide images found in "${source}".`);
  const pdfOption = option('pdf');
  if (pdfOption && !fs.existsSync(pdfOption)) fail(`--pdf "${pdfOption}" does not exist.`);
  resetSlidesDir();
  const unoptimized = images.filter(isUnoptimizedImage);
  if (unoptimized.length > 0) {
    console.error(`Warning: ${unoptimized.length} WebP/AVIF slide(s) will be served full size, without smaller variants. Export PNG or JPEG for responsive slides.`);
  }
  images.forEach((name, i) => {
    const target = slideFileName(i, images.length, path.extname(name));
    fs.copyFileSync(path.join(source, name), path.join(slidesDir, target));
    written.push(target);
  });
  if (pdfOption) pdfLink = copyPdf(pdfOption);
} else if (source.toLowerCase().endsWith('.pdf')) {
  const [{ pdf }, { default: sizeOf }] = await Promise.all([import('pdf-to-img'), import('image-size')]);
  resetSlidesDir();
  try {
    const probe = await pdf(source, { scale: 1 });
    const firstPage = await probe.getPage(1);
    const scale = pdfRenderScale(sizeOf(firstPage).width ?? 0, width);
    title ??= probe.metadata.Title?.trim() || undefined;
    await probe.destroy();

    const document = await pdf(source, { scale });
    let i = 0;
    for await (const page of document) {
      const target = slideFileName(i++, document.length, '.png');
      fs.writeFileSync(path.join(slidesDir, target), page);
      written.push(target);
    }
  } catch (error) {
    fs.rmSync(slidesDir, { recursive: true, force: true });
    fail(`could not render "${source}": ${error instanceof Error ? error.message : String(error)}`);
  }
  if (written.length === 0) fail(`"${source}" has no pages.`);
  pdfLink = copyPdf(option('pdf') ?? source);
} else {
  fail(`"${source}" is neither a folder of slide images nor a .pdf file.`);
}

console.log(formatSlidesBlock({ title, dir, files: written, pdf: pdfLink, video }));
console.error(`
Copied ${written.length} slide(s) to ${slidesDir}${pdfLink ? ` and the PDF to ${into}` : ''}.
Next:
  - Paste the block above into the content, and replace each "Slide N" with
    alt text that says what the slide shows.
  - Run \`bun scripts/copy-assets.ts\` to see the slides in \`bun dev\`.`);
