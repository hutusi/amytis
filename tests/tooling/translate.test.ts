import { afterAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Runs scripts/translate.ts in temp sites against a local stand-in for an
// OpenAI-compatible chat API. The script is spawned asynchronously: a
// blocking spawn would stall this process's server and deadlock.
const SCRIPT = path.resolve('scripts/translate.ts');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-translate-'));

type Mode = 'translate' | 'drop-placeholder' | 'fence' | 'fail-once';
let mode: Mode = 'translate';
let failedOnce = false;
const requests: Array<{ auth: string | null; model: string; system: string; user: string }> = [];

/** A stand-in translation: marks every prose line, keeps structure. */
function fakeTranslate(text: string): string {
  return text.split('\n').map((line) => {
    if (/^\s*(?:@@BLOCK_\d+@@|:::|$)/.test(line)) return line;
    const heading = line.match(/^(#{1,6}\s+)(.*)$/);
    if (heading) return `${heading[1]}译 ${heading[2]}`;
    return line.replace(/^(\s*(?:[-*]\s+|>\s*)?)(.*)$/, '$1译 $2');
  }).join('\n');
}

const server = Bun.serve({
  port: 0,
  async fetch(request) {
    const body = (await request.json()) as { model: string; messages: Array<{ content: string }> };
    const [system, user] = body.messages.map((message) => message.content);
    requests.push({ auth: request.headers.get('authorization'), model: body.model, system, user });
    if (mode === 'fail-once' && !failedOnce) {
      failedOnce = true;
      return new Response('busy', { status: 503 });
    }
    let content: string;
    if (system.includes('JSON array')) {
      content = JSON.stringify((JSON.parse(user) as string[]).map((value) => `译 ${value}`));
    } else {
      content = fakeTranslate(user);
      if (mode === 'drop-placeholder') content = content.replace('@@BLOCK_0@@', '');
      if (mode === 'fence') content = `\`\`\`markdown\n${content}\n\`\`\``;
    }
    return Response.json({ choices: [{ message: { content } }] });
  },
});

afterAll(() => {
  server.stop(true);
  fs.rmSync(root, { recursive: true, force: true });
});

async function run(cwd: string, args: string[], env: Record<string, string | undefined> = {}) {
  const merged: Record<string, string | undefined> = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('TRANSLATE_'))),
    TRANSLATE_BASE_URL: `http://127.0.0.1:${server.port}/v1`,
    TRANSLATE_MODEL: 'test-model',
    TRANSLATE_API_KEY: 'test-key',
    ...env,
  };
  const proc = Bun.spawn(['bun', SCRIPT, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: Object.fromEntries(Object.entries(merged).filter((entry): entry is [string, string] => entry[1] !== undefined)),
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}

let siteCount = 0;
function site(files: Record<string, string>): string {
  const cwd = path.join(root, `site-${siteCount++}`);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(cwd, 'content', rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return cwd;
}

const read = (cwd: string, rel: string) => fs.readFileSync(path.join(cwd, 'content', rel), 'utf8');
const exists = (cwd: string, rel: string) => fs.existsSync(path.join(cwd, 'content', rel));

const POST = [
  '---',
  'title: "Hello World"',
  'excerpt: "A first post."',
  'date: 2026-01-02',
  'tags: ["intro"]',
  'redirectFrom:',
  '  - /old-hello',
  'coverImage: "images/cover.png"',
  '---',
  '',
  '## Getting Started',
  '',
  'See [below](#getting-started) and run:',
  '',
  '```sh',
  'bun dev   # Hello stays',
  '```',
  '',
  '![Diagram](./images/diagram.png)',
  '',
].join('\n');

const SERIES = {
  'series/garden/index.mdx': '---\ntitle: "The Garden"\nposts: ["01-intro", "02-next"]\n---\n\nAbout the series.\n',
  'series/garden/01-intro.mdx': '---\ntitle: "Intro"\ndate: "2026-01-01"\n---\n\nFirst.\n',
  'series/garden/02-next.mdx': '---\ntitle: "Next"\ndate: "2026-01-02"\n---\n\nSecond.\n',
};

describe('translate script', () => {
  test('translates a flat post into the zh tree, keeping code, dates and tags', async () => {
    mode = 'translate';
    const cwd = site({ 'posts/hello.mdx': POST, 'posts/images/cover.png': 'cover', 'posts/images/diagram.png': 'diagram' });
    const before = requests.length;
    const { code, stderr } = await run(cwd, ['content/posts/hello.mdx']);
    expect(code).toBe(0);
    const out = read(cwd, 'zh/posts/hello.mdx');
    expect(out).toStartWith([
      '---',
      'title: "译 Hello World"',
      'excerpt: "译 A first post."',
      'date: 2026-01-02',
      'tags: ["intro"]',
      'coverImage: "images/cover.png"',
      '---',
      '',
      '## 译 Getting Started',
    ].join('\n'));
    expect(out).toContain('```sh\nbun dev   # Hello stays\n```');
    expect(out).toContain('译 ![Diagram](./images/diagram.png)');
    expect(read(cwd, 'zh/posts/images/cover.png')).toBe('cover');
    expect(read(cwd, 'zh/posts/images/diagram.png')).toBe('diagram');
    expect(stderr).toContain('Warning: content/zh/posts/hello.mdx: links to #getting-started point at headings whose ids changed');

    const sent = requests.slice(before);
    expect(sent.every((r) => r.auth === 'Bearer test-key' && r.model === 'test-model')).toBe(true);
    expect(sent.some((r) => r.user.includes('bun dev'))).toBe(false);
  });

  test('a folder post brings its whole folder, keeping files the zh tree already has', async () => {
    mode = 'translate';
    const cwd = site({
      'posts/talk/index.mdx': '---\ntitle: "Talk"\n---\n\n![Slide](./slides/1.svg)\n',
      'posts/talk/slides/1.svg': '<svg>en</svg>',
      'posts/talk/notes.txt': 'notes',
      'zh/posts/talk/slides/1.svg': '<svg>zh</svg>',
    });
    const { code, stderr } = await run(cwd, ['content/posts/talk/']);
    expect(code).toBe(0);
    expect(exists(cwd, 'zh/posts/talk/index.mdx')).toBe(true);
    expect(read(cwd, 'zh/posts/talk/slides/1.svg')).toBe('<svg>zh</svg>');
    expect(read(cwd, 'zh/posts/talk/notes.txt')).toBe('notes');
    expect(stderr).toContain('Kept 1 file that already existed');
  });

  test('a series post brings the series index and warns about listed posts still missing', async () => {
    mode = 'translate';
    const cwd = site(SERIES);
    const { code, stderr } = await run(cwd, ['content/series/garden/01-intro.mdx']);
    expect(code).toBe(0);
    expect(read(cwd, 'zh/series/garden/index.mdx')).toContain('title: "译 The Garden"\nposts: ["01-intro", "02-next"]');
    expect(exists(cwd, 'zh/series/garden/01-intro.mdx')).toBe(true);
    expect(exists(cwd, 'zh/series/garden/02-next.mdx')).toBe(false);
    expect(stderr).toContain('content/zh/series/garden/ lists posts with no zh version yet: 02-next.');
  });

  test('a whole series folder translates every file and leaves nothing to warn about', async () => {
    mode = 'translate';
    const cwd = site(SERIES);
    const { code, stderr } = await run(cwd, ['content/series/garden']);
    expect(code).toBe(0);
    for (const file of Object.keys(SERIES)) expect(exists(cwd, `zh/${file}`)).toBe(true);
    expect(stderr).not.toContain('Warning:');
    expect(stderr).toContain('Wrote 3 translations into content/zh/.');
  });

  test('--dry-run prints the translation and writes nothing', async () => {
    mode = 'translate';
    const cwd = site({ 'posts/hello.mdx': POST, 'posts/images/cover.png': 'c', 'posts/images/diagram.png': 'd' });
    const { code, stdout } = await run(cwd, ['content/posts/hello.mdx', '--dry-run']);
    expect(code).toBe(0);
    expect(stdout).toContain('===== content/zh/posts/hello.mdx =====\n---\ntitle: "译 Hello World"');
    expect(exists(cwd, 'zh')).toBe(false);
  });

  test('refuses an existing translation unless --force', async () => {
    mode = 'translate';
    const cwd = site({ 'notes/idea.md': '---\ntitle: "Idea"\n---\n\nText.\n' });
    expect((await run(cwd, ['content/notes/idea.md'])).code).toBe(0);
    const again = await run(cwd, ['content/notes/idea.md']);
    expect(again.code).toBe(1);
    expect(again.stderr).toContain('Already translated: content/zh/notes/idea.md. Pass --force');
    expect((await run(cwd, ['content/notes/idea.md', '--force'])).code).toBe(0);
  });

  test('refuses flows, locale trees, the default locale and missing settings without calling the API', async () => {
    mode = 'translate';
    const cwd = site({
      'flows/2026/01/02.md': 'A flow.\n',
      'zh/posts/x.mdx': '---\ntitle: "X"\n---\n',
      'posts/y.mdx': '---\ntitle: "Y"\n---\n',
    });
    const before = requests.length;
    const cases: Array<[string[], Record<string, string | undefined>, string]> = [
      [['content/flows/2026/01/02.md'], {}, "Flows can't be translated yet"],
      [['content/zh/posts/x.mdx'], {}, 'is a locale tree'],
      [['content/posts/y.mdx', '--to', 'en'], {}, 'is the default locale'],
      [['content/posts/y.mdx'], { TRANSLATE_API_KEY: undefined }, 'Missing TRANSLATE_API_KEY'],
    ];
    for (const [args, env, message] of cases) {
      const { code, stderr } = await run(cwd, args, env);
      expect(code).toBe(1);
      expect(stderr).toContain(message);
    }
    expect(requests.length).toBe(before);
  });

  test('a reply that loses a code block is reported and not written', async () => {
    mode = 'drop-placeholder';
    const cwd = site({ 'posts/hello.mdx': POST, 'posts/images/cover.png': 'c', 'posts/images/diagram.png': 'd' });
    const { code, stderr } = await run(cwd, ['content/posts/hello.mdx']);
    expect(code).toBe(1);
    expect(stderr).toContain('code/math placeholders: missing @@BLOCK_0@@');
    expect(stderr).toContain('Failed: content/posts/hello.mdx.');
    expect(exists(cwd, 'zh/posts/hello.mdx')).toBe(false);
  });

  test('unwraps a reply wrapped in a fence, and retries once after a server error', async () => {
    const cwd = site({ 'notes/a.md': '---\ntitle: "A"\n---\n\nText.\n', 'notes/b.md': '---\ntitle: "B"\n---\n\nMore.\n' });
    mode = 'fence';
    expect((await run(cwd, ['content/notes/a.md'])).code).toBe(0);
    expect(read(cwd, 'zh/notes/a.md')).toBe('---\ntitle: "译 A"\n---\n\n译 Text.\n');

    mode = 'fail-once';
    failedOnce = false;
    expect((await run(cwd, ['content/notes/b.md'])).code).toBe(0);
    expect(read(cwd, 'zh/notes/b.md')).toBe('---\ntitle: "译 B"\n---\n\n译 More.\n');
  });
});
