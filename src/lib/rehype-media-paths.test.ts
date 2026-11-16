import { describe, expect, test } from 'bun:test';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import rehypeMediaPaths from './rehype-media-paths';

function run(html: string, options: Parameters<typeof rehypeMediaPaths>[0] = { slug: 'flows/2026/11/16' }): string {
  return String(
    unified().use(rehypeParse, { fragment: true }).use(rehypeMediaPaths, options).use(rehypeStringify).processSync(html),
  );
}

describe('rehypeMediaPaths', () => {
  test('resolves co-located video, audio, source and track paths against the asset base', () => {
    expect(run('<video src="./clip.mp4"></video>')).toBe('<video src="/flows/2026/11/16/clip.mp4"></video>');
    expect(run('<audio src="ep.mp3"></audio>')).toBe('<audio src="/flows/2026/11/16/ep.mp3"></audio>');
    expect(run('<video><source src="./media/clip.webm"><track src="./clip.vtt"></video>'))
      .toBe('<video><source src="/flows/2026/11/16/media/clip.webm"><track src="/flows/2026/11/16/clip.vtt"></video>');
  });

  test('resolves a video poster like an image, CDN prefix included', () => {
    expect(run('<video poster="./clip.jpg"></video>')).toBe('<video poster="/flows/2026/11/16/clip.jpg"></video>');
    expect(run('<video poster="./clip.jpg" src="./clip.mp4"></video>', { slug: 'posts/talk', cdnBaseUrl: 'https://cdn.test/' }))
      .toBe('<video poster="https://cdn.test/posts/talk/clip.jpg" src="/posts/talk/clip.mp4"></video>');
  });

  test('leaves external, site-absolute and escaping paths as written', () => {
    for (const html of [
      '<video src="https://cdn.test/clip.mp4" poster="//cdn.test/clip.jpg"></video>',
      '<video src="/media/clip.mp4"></video>',
      '<video src="../other/clip.mp4"></video>',
      '<audio src="data:audio/ogg;base64,AA=="></audio>',
    ]) {
      expect(run(html)).toBe(html);
    }
  });

  test('without an asset base, relative paths stay relative', () => {
    expect(run('<video src="./clip.mp4" poster="./clip.jpg"></video>', {}))
      .toBe('<video src="./clip.mp4" poster="./clip.jpg"></video>');
  });

  test('ignores picture sources (srcset) and non-media src attributes', () => {
    const html = '<picture><source srcset="./a.webp"></picture><iframe src="./embed.html"></iframe><script src="./x.js"></script>';
    expect(run(html)).toBe(html);
  });
});
