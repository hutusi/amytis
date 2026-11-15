import fs from 'fs';
import path from 'path';
import {
  formatSlidesBlock,
  isSlideImage,
  isUnoptimizedImage,
  linkSafeFileName,
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
const pdfOption = option('pdf');
if (pdfOption !== undefined && !fs.existsSync(pdfOption)) fail(`--pdf "${pdfOption}" does not exist.`);
const sourceIsFolder = fs.statSync(source).isDirectory();
if (!sourceIsFolder && !source.toLowerCase().endsWith('.pdf')) {
  fail(`"${source}" is neither a folder of slide images nor a .pdf file.`);
}

// The slides folder is replaced, so an input inside it (a re-import from
// the destination, a PDF kept there) would be deleted with the old deck.
// Real paths, so a symlink or /tmp vs /private/tmp can't hide the overlap.
const realSlidesDir = path.join(fs.realpathSync(into), dir);
function isInsideSlidesDir(file: string): boolean {
  const relative = path.relative(realSlidesDir, fs.realpathSync(file));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
for (const input of [source, pdfOption]) {
  if (input && isInsideSlidesDir(input)) {
    fail(`"${input}" is inside ${slidesDir}, which new-slides replaces. Move it out of that folder first.`);
  }
}

if (fs.existsSync(slidesDir) && fs.readdirSync(slidesDir).length > 0 && !force) {
  fail(`${slidesDir} already has files. Pass --force to replace them.`);
}

// The PDF linked as the download, --pdf or the PDF being imported, is
// copied next to the content, under a name its link can reach, unless it
// is there already.
const pdfFile = pdfOption ?? (sourceIsFolder ? undefined : source);
const pdfTarget = pdfFile ? path.join(into, linkSafeFileName(path.basename(pdfFile))) : undefined;
const pdfCopy = pdfFile && pdfTarget && path.resolve(pdfFile) !== path.resolve(pdfTarget)
  ? { from: pdfFile, to: pdfTarget }
  : undefined;
if (pdfCopy && fs.existsSync(pdfCopy.to) && !force) fail(`${pdfCopy.to} already exists. Pass --force to replace it.`);

// The new deck is built in a staging folder beside the old one and swapped
// in only once every slide is written and the PDF copied, so a failed render
// or copy leaves the existing deck as it was. fail() exits, and the exit
// hook removes what is left of the staging folder.
const stagingDir = fs.mkdtempSync(path.join(into, `.${dir}-`));
process.on('exit', () => fs.rmSync(stagingDir, { recursive: true, force: true }));

let title = option('title');
const written: string[] = [];

if (sourceIsFolder) {
  const images = sortSlideFiles(fs.readdirSync(source).filter((name) => isSlideImage(name) && fs.statSync(path.join(source, name)).isFile()));
  if (images.length === 0) fail(`No slide images found in "${source}".`);
  const unoptimized = images.filter(isUnoptimizedImage);
  if (unoptimized.length > 0) {
    console.error(`Warning: ${unoptimized.length} WebP/AVIF slide(s) will be served full size, without smaller variants. Export PNG or JPEG for responsive slides.`);
  }
  images.forEach((name, i) => {
    const target = slideFileName(i, images.length, path.extname(name));
    fs.copyFileSync(path.join(source, name), path.join(stagingDir, target));
    written.push(target);
  });
} else {
  const [{ pdf }, { default: sizeOf }] = await Promise.all([import('pdf-to-img'), import('image-size')]);
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
      fs.writeFileSync(path.join(stagingDir, target), page);
      written.push(target);
    }
  } catch (error) {
    fail(`could not render "${source}": ${error instanceof Error ? error.message : String(error)}`);
  }
  if (written.length === 0) fail(`"${source}" has no pages.`);
}

if (pdfCopy) fs.copyFileSync(pdfCopy.from, pdfCopy.to);
fs.rmSync(slidesDir, { recursive: true, force: true });
fs.renameSync(stagingDir, slidesDir);
const pdfLink = pdfTarget ? `./${path.basename(pdfTarget)}` : undefined;

console.log(formatSlidesBlock({ title, dir, files: written, pdf: pdfLink, video }));
console.error(`
Copied ${written.length} slide(s) to ${slidesDir}${pdfTarget ? ` and the PDF to ${pdfTarget}` : ''}.
Next:
  - Paste the block above into the content, and replace each "Slide N" with
    alt text that says what the slide shows.
  - Run \`bun scripts/copy-assets.ts\` to see the slides in \`bun dev\`.`);
