import { afterAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'bun';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatSlidesBlock, isSlideImage, pdfRenderScale, slideFileName, sortSlideFiles } from '../../scripts/lib/slides';

const SCRIPT = 'scripts/new-slides.ts';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-new-slides-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

function tempDir(name: string, files: string[] = []): string {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of files) fs.writeFileSync(path.join(dir, file), `image ${file}`);
  return dir;
}

function run(...args: string[]) {
  const result = spawnSync(['bun', SCRIPT, ...args]);
  return { code: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

/** A minimal PDF with one 960×540pt page per text, and a document title. */
function minimalPdf(texts: string[], title: string): Buffer {
  const n = texts.length;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${texts.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`,
    ...texts.flatMap((text, i) => {
      const stream = `BT /F1 48 Tf 100 270 Td (${text}) Tj ET`;
      return [
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 960 540] /Contents ${4 + i * 2} 0 R /Resources << /Font << /F1 ${3 + n * 2} 0 R >> >> >>`,
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      ];
    }),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${title}) >>`,
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((object, i) => {
    const offset = out.length;
    out += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

describe('new-slides helpers', () => {
  test('sorts Keynote and PowerPoint exports into deck order', () => {
    expect(sortSlideFiles(['Slide10.PNG', 'Slide2.PNG', 'slide1.png', 'Slide11.PNG'])).toEqual(['slide1.png', 'Slide2.PNG', 'Slide10.PNG', 'Slide11.PNG']);
    expect(sortSlideFiles(['Talk.010.jpeg', 'Talk.002.jpeg', 'Talk.001.jpeg'])).toEqual(['Talk.001.jpeg', 'Talk.002.jpeg', 'Talk.010.jpeg']);
  });

  test('names slides so they sort everywhere', () => {
    expect(slideFileName(0, 9, '.PNG')).toBe('slide-01.png');
    expect(slideFileName(11, 40, '.jpeg')).toBe('slide-12.jpeg');
    expect(slideFileName(4, 120, '.png')).toBe('slide-005.png');
  });

  test('accepts image files only, never dotfiles', () => {
    expect(['a.png', 'b.JPG', 'c.svg', '.DS_Store', '._a.png', 'notes.txt', 'deck.key'].filter(isSlideImage)).toEqual(['a.png', 'b.JPG', 'c.svg']);
  });

  test('renders PDF pages about the target width', () => {
    expect(pdfRenderScale(960, 1920)).toBe(2);
    expect(pdfRenderScale(1920, 1920)).toBe(1);
    expect(pdfRenderScale(100, 1920)).toBe(4);
    expect(pdfRenderScale(0, 1920)).toBe(1);
  });

  test('formats the block with escaped title and attributes', () => {
    expect(formatSlidesBlock({ title: 'Ship [it] "now"', dir: 'slides', files: ['slide-01.png', 'slide-02.png'], pdf: './a "b".pdf', video: 'https://x.dev/?a=1&b=2' })).toBe([
      ':::slides[Ship \\[it\\] "now"]{pdf="./a &quot;b&quot;.pdf" video="https://x.dev/?a=1&amp;b=2"}',
      '![Slide 1](./slides/slide-01.png)',
      '![Slide 2](./slides/slide-02.png)',
      ':::',
    ].join('\n'));
    expect(formatSlidesBlock({ dir: 'deck', files: ['slide-01.png'] })).toBe(':::slides\n![Slide 1](./deck/slide-01.png)\n:::');
  });

  test('keeps a multi-line title on the opener line', () => {
    expect(formatSlidesBlock({ title: '  Talk\r\n  Subtitle\n', dir: 'slides', files: ['slide-01.png'] }))
      .toBe(':::slides[Talk Subtitle]\n![Slide 1](./slides/slide-01.png)\n:::');
    expect(formatSlidesBlock({ title: ' \n ', dir: 'slides', files: ['slide-01.png'] })).toStartWith(':::slides\n');
  });
});

describe('new-slides script', () => {
  test('without a source or --into it prints usage and fails', () => {
    expect(run().code).not.toBe(0);
    const { code, stderr } = run(tempDir('only-source', ['a.png']));
    expect(code).not.toBe(0);
    expect(stderr).toContain('--into');
  });

  test('refuses a content file as --into, with a hint to use a folder', () => {
    const file = path.join(tempDir('flat'), 'my-talk.md');
    fs.writeFileSync(file, '# Talk');
    const { code, stderr } = run(tempDir('flat-src', ['a.png']), '--into', file);
    expect(code).not.toBe(0);
    expect(stderr).toContain('my-talk/index.md');
  });

  test('fails on a folder without images, and leaves the content folder alone', () => {
    const into = tempDir('post-empty');
    const { code, stderr } = run(tempDir('no-images', ['notes.txt']), '--into', into);
    expect(code).not.toBe(0);
    expect(stderr).toContain('No slide images');
    expect(fs.readdirSync(into)).toEqual([]);
  });

  test('copies an image export in deck order and prints the block', () => {
    const into = tempDir('post-images');
    const pdf = path.join(tempDir('pdf-src'), 'talk.pdf');
    fs.writeFileSync(pdf, 'pdf');
    const { code, stdout } = run(
      tempDir('powerpoint', ['Slide10.PNG', 'Slide2.PNG', 'Slide1.PNG', '.DS_Store']),
      '--into', into, '--title', 'My Talk', '--pdf', pdf, '--video', 'https://youtu.be/abc',
    );
    expect(code).toBe(0);
    expect(fs.readdirSync(path.join(into, 'slides')).sort()).toEqual(['slide-01.png', 'slide-02.png', 'slide-03.png']);
    // Slide10 is the third slide, not the second.
    expect(fs.readFileSync(path.join(into, 'slides', 'slide-03.png'), 'utf8')).toBe('image Slide10.PNG');
    // The PDF sits next to the content, and no staging folder is left.
    expect(fs.readdirSync(into).sort()).toEqual(['slides', 'talk.pdf']);
    expect(stdout.trim()).toBe([
      ':::slides[My Talk]{pdf="./talk.pdf" video="https://youtu.be/abc"}',
      '![Slide 1](./slides/slide-01.png)',
      '![Slide 2](./slides/slide-02.png)',
      '![Slide 3](./slides/slide-03.png)',
      ':::',
    ].join('\n'));
  });

  test('never overwrites existing slides without --force', () => {
    const into = tempDir('post-existing');
    const source = tempDir('export-twice', ['a.png', 'b.png']);
    expect(run(source, '--into', into).code).toBe(0);
    const again = run(source, '--into', into);
    expect(again.code).not.toBe(0);
    expect(again.stderr).toContain('--force');
    expect(run(source, '--into', into, '--force').code).toBe(0);
  });

  test('a failed --force import keeps the existing deck', () => {
    const into = tempDir('post-failed-import');
    const slides = tempDir('post-failed-import/slides', ['slide-01.png', 'slide-02.png']);
    const broken = path.join(tempDir('broken-export'), 'broken.pdf');
    fs.writeFileSync(broken, 'not a pdf');

    const missingPdf = run(broken, '--into', into, '--pdf', path.join(root, 'missing.pdf'), '--force');
    expect(missingPdf.code).not.toBe(0);
    expect(missingPdf.stderr).toContain('does not exist');

    const unreadable = run(broken, '--into', into, '--force');
    expect(unreadable.code).not.toBe(0);
    expect(unreadable.stderr).toContain('could not render');

    expect(fs.readdirSync(slides).sort()).toEqual(['slide-01.png', 'slide-02.png']);
    expect(fs.readdirSync(into)).toEqual(['slides']);
  });

  test('refuses to import from inside the slides folder it would replace, even with --force', () => {
    const into = tempDir('post-reimport');
    const slides = tempDir('post-reimport/slides', ['slide-01.png', 'slide-02.png']);
    const { code, stderr } = run(slides, '--into', into, '--force');
    expect(code).not.toBe(0);
    expect(stderr).toContain('Move it out of that folder');
    expect(fs.readdirSync(slides).sort()).toEqual(['slide-01.png', 'slide-02.png']);

    const pdf = path.join(slides, 'talk.pdf');
    fs.writeFileSync(pdf, 'pdf');
    expect(run(pdf, '--into', into, '--force').code).not.toBe(0);
    expect(run(tempDir('reimport-export', ['a.png']), '--into', into, '--pdf', pdf, '--force').code).not.toBe(0);
    expect(fs.readdirSync(slides).sort()).toEqual(['slide-01.png', 'slide-02.png', 'talk.pdf']);
  });

  test('renders a PDF export to PNG slides and links the PDF', () => {
    const into = tempDir('post-pdf');
    const pdf = path.join(tempDir('pdf-export'), 'deck.pdf');
    fs.writeFileSync(pdf, minimalPdf(['One', 'Two'], 'Exported Deck'));
    const { code, stdout } = run(pdf, '--into', into, '--width', '960');
    expect(code).toBe(0);
    expect(fs.readdirSync(path.join(into, 'slides')).sort()).toEqual(['slide-01.png', 'slide-02.png']);
    const png = fs.readFileSync(path.join(into, 'slides', 'slide-01.png'));
    // PNG signature, and a 960px-wide page at --width 960.
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(960);
    expect(fs.existsSync(path.join(into, 'deck.pdf'))).toBe(true);
    expect(stdout).toContain(':::slides[Exported Deck]{pdf="./deck.pdf"}');
  });
});
