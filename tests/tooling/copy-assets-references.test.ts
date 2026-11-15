import { afterAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractReferencedAssetPaths } from '../../scripts/copy-assets';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-copy-assets-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function referencesOf(markdown: string): string[] {
  const file = path.join(dir, `post-${Math.random().toString(36).slice(2)}.md`);
  fs.writeFileSync(file, markdown);
  return extractReferencedAssetPaths(file).sort();
}

// Flat (single-file) posts copy only the files they reference, so every
// way content can point at a co-located file must be found here.
describe('copy-assets referenced files', () => {
  test("a slide deck's images and PDF are copied; an external video is not", () => {
    const refs = referencesOf([
      ':::slides[Talk]{pdf="./talk.pdf" video="https://youtu.be/abc"}',
      '![Title](./slides/slide-01.png)',
      '![Agenda](./slides/slide-02.png)',
      ':::',
    ].join('\n'));
    expect(refs).toEqual(['./slides/slide-01.png', './slides/slide-02.png', './talk.pdf']);
  });

  test('deck attributes are found in every form the directive parser accepts', () => {
    expect(referencesOf(':::slides{pdf=./talk.pdf}\n![a](a.png)\n:::')).toEqual(['./talk.pdf', 'a.png']);
    expect(referencesOf(':::slides[T]{pdf = "files/deck.pdf" video=media/talk.mp4}\n![a](a.png)\n:::'))
      .toEqual(['a.png', 'files/deck.pdf', 'media/talk.mp4']);
    expect(referencesOf(':::slides{#talk video=https://youtu.be/x pdf=deck.pdf}\n:::')).toEqual(['deck.pdf']);
  });

  test('character references are decoded like the parsers decode them', () => {
    // new-slides writes `&` and `"` in a file name as references.
    expect(referencesOf(':::slides[T]{pdf="./R&amp;D &quot;final&quot;.pdf"}\n![a](./Q&#38;A.png)\n:::'))
      .toEqual(['./Q&A.png', './R&D "final".pdf']);
    expect(referencesOf(':::slides{pdf=./R&amp;D.pdf}\n![a](a.png)\n:::')).toEqual(['./R&D.pdf', 'a.png']);
    expect(referencesOf('<img src="./R&amp;D.png">')).toEqual(['./R&D.png']);
    // rST and YAML have no character references: names stay as written.
    expect(referencesOf('---\ncoverImage: ./a&amp;b.png\n---\n')).toEqual(['./a&amp;b.png']);
  });

  test('a co-located talk video is copied', () => {
    expect(referencesOf(":::slides{video='media/talk.mp4'}\n![a](a.png)\n:::")).toEqual(['a.png', 'media/talk.mp4']);
  });

  test('the existing reference forms still count', () => {
    expect(referencesOf('![x](img/x.png) [doc](files/doc.pdf) <video src="v.mp4" poster="p.jpg"></video>'))
      .toEqual(['files/doc.pdf', 'img/x.png', 'p.jpg', 'v.mp4']);
  });
});
