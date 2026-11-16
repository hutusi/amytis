import { describe, expect, test } from 'bun:test';
import matter from 'gray-matter';
import {
  classifySource,
  compareStructure,
  danglingAnchors,
  findTranslatableFields,
  listedBookChapters,
  listedSeriesPosts,
  maskBlocks,
  parseFieldTranslations,
  resolveTargetLocale,
  rewriteFrontmatter,
  seriesPostSlug,
  splitFrontmatter,
  splitIntoChunks,
  unmaskBlocks,
  unwrapModelOutput,
} from '../../scripts/lib/translate';

const I18N = { enabled: true, defaultLocale: 'en', locales: ['en', 'zh'] };

describe('resolveTargetLocale', () => {
  test('defaults to the only other locale and accepts it explicitly', () => {
    expect(resolveTargetLocale(I18N)).toBe('zh');
    expect(resolveTargetLocale(I18N, 'zh')).toBe('zh');
  });

  test('refuses what the site cannot hold', () => {
    expect(() => resolveTargetLocale({ ...I18N, enabled: false })).toThrow('i18n is disabled');
    expect(() => resolveTargetLocale(I18N, 'en')).toThrow('default locale');
    expect(() => resolveTargetLocale(I18N, 'ja')).toThrow('not in i18n.locales');
    expect(() => resolveTargetLocale({ ...I18N, locales: ['en', 'zh', 'ja'] })).toThrow('Pass --to with one of: zh, ja');
    expect(() => resolveTargetLocale({ ...I18N, locales: ['en'] })).toThrow('no locale besides the default');
  });
});

describe('classifySource', () => {
  test('names the content domain', () => {
    expect(classifySource('posts/hello.mdx', false)).toBe('posts');
    expect(classifySource('series/garden', true)).toBe('series');
    expect(classifySource('books/handbook/setup.mdx', false)).toBe('books');
    expect(classifySource('notes/idea.md', false)).toBe('notes');
    expect(classifySource('about.mdx', false)).toBe('pages');
  });

  test('refuses flows, locale trees, whole domains and paths outside content/', () => {
    expect(() => classifySource('flows/2026/03/10.md', false)).toThrow("Flows can't be translated yet");
    expect(() => classifySource('zh/posts/hello.mdx', false)).toThrow('is a locale tree');
    expect(() => classifySource('posts', true)).toThrow('one item at a time');
    expect(() => classifySource('../README.md', false)).toThrow('inside content/');
    expect(() => classifySource('drafts/x.md', false)).toThrow('not a post, series, book, note or page');
  });
});

describe('frontmatter', () => {
  const FM = [
    'title: "The \\"Garden\\" Handbook"',
    "subtitle: 'It''s growing'",
    'excerpt: A plain excerpt # a comment',
    'date: 2026-01-15',
    'tags: ["markdown", "guide"]',
    'coverImage: "text:Media"',
    '# Kept: an author comment.',
    'chapters:',
    '  - part: "Part I"',
    '    chapters:',
    '      - title: "Introduction"',
    '        id: "introduction"',
    'redirectFrom:',
    '  - /old-path',
    '  - /older-path',
    'featured: true',
    '',
  ].join('\n');

  test('splits frontmatter from the body', () => {
    expect(splitFrontmatter(`---\n${FM}---\n\nBody\n`)).toEqual({ frontmatter: FM, body: '\nBody\n' });
    expect(splitFrontmatter('No frontmatter\n---\n')).toEqual({ frontmatter: null, body: 'No frontmatter\n---\n' });
  });

  test('finds titles, excerpts, parts and text covers at any depth', () => {
    expect(findTranslatableFields(FM).map((f) => [f.key, f.text])).toEqual([
      ['title', 'The "Garden" Handbook'],
      ['subtitle', "It's growing"],
      ['excerpt', 'A plain excerpt'],
      ['coverImage', 'Media'],
      ['part', 'Part I'],
      ['title', 'Introduction'],
    ]);
    expect(findTranslatableFields('coverImage: "./cover.jpg"\ndescription: ""\n')).toEqual([]);
  });

  test('rewrites only those values, keeps everything else and drops redirectFrom', () => {
    const fields = findTranslatableFields(FM);
    const result = rewriteFrontmatter(FM, fields, ['“花园”手册', '在生长', '摘要', '媒体', '第一部分', '引言']);
    expect(result).toBe([
      'title: "“花园”手册"',
      'subtitle: "在生长"',
      'excerpt: "摘要"',
      'date: 2026-01-15',
      'tags: ["markdown", "guide"]',
      'coverImage: "text:媒体"',
      '# Kept: an author comment.',
      'chapters:',
      '  - part: "第一部分"',
      '    chapters:',
      '      - title: "引言"',
      '        id: "introduction"',
      'featured: true',
      '',
    ].join('\n'));
    expect(rewriteFrontmatter('title: x\nredirectFrom: ["/a", "/b"]\ndate: "2026-01-01"\n', [], []))
      .toBe('title: x\ndate: "2026-01-01"\n');
  });

  test('reads a value over all its lines and rewrites it as one valid line', () => {
    const fm = [
      'title: A long title',
      '  that continues',
      'excerpt: >-',
      '  A folded',
      '',
      '  excerpt',
      'subtitle: "Quoted',
      '  over lines"',
      'chapters:',
      '  - section: "Basics"',
      '    items:',
      '      - title: "Intro"',
      '        id: "intro"',
      'date: 2026-01-01',
      '',
    ].join('\n');
    const fields = findTranslatableFields(fm);
    expect(fields.map((f) => [f.key, f.text, f.line, f.endLine])).toEqual([
      ['title', 'A long title that continues', 0, 1],
      ['excerpt', 'A folded excerpt', 2, 5],
      ['subtitle', 'Quoted over lines', 6, 7],
      ['section', 'Basics', 9, 9],
      ['title', 'Intro', 11, 11],
    ]);
    const out = rewriteFrontmatter(fm, fields, ['长标题', '摘要', '副标题', '基础', '引言']);
    expect(matter(`---\n${out}---\n`).data).toEqual({
      title: '长标题',
      excerpt: '摘要',
      subtitle: '副标题',
      chapters: [{ section: '基础', items: [{ title: '引言', id: 'intro' }] }],
      date: new Date('2026-01-01'),
    });
  });

  test('leaves a mapping or sequence under a translated key alone', () => {
    for (const fm of ['title:\n  en: A\n  zh: B\n', 'title:\n  - A\n  - B\n']) {
      expect(findTranslatableFields(fm)).toEqual([]);
    }
  });

  test('escapes quotes and backslashes in translations', () => {
    const fields = findTranslatableFields('title: "x"\n');
    expect(rewriteFrontmatter('title: "x"\n', fields, ['a "b" \\ c'])).toBe('title: "a \\"b\\" \\\\ c"\n');
  });
});

describe('masking', () => {
  const BODY = [
    'Intro',
    '',
    '```ts title="a.ts"',
    'const a = 1; // comment',
    '```',
    '',
    '- item',
    '  ~~~~',
    '  ~~~ not a close',
    '  ~~~~',
    '',
    '> ```sh',
    '> echo hi',
    '> ```',
    '',
    '$$',
    'E = mc^2',
    '$$',
    '',
    '````md',
    '```js',
    'nested',
    '```',
    '````',
    '',
    'Outro',
  ].join('\n');

  test('swaps each block for an indented placeholder and restores it exactly', () => {
    const { masked, blocks } = maskBlocks(BODY);
    expect(blocks).toHaveLength(5);
    expect(masked).toBe([
      'Intro', '', '@@BLOCK_0@@', '', '- item', '  @@BLOCK_1@@', '', '> @@BLOCK_2@@', '', '@@BLOCK_3@@', '', '@@BLOCK_4@@', '', 'Outro',
    ].join('\n'));
    expect(unmaskBlocks(masked, blocks)).toBe(BODY);
  });

  test('masks a fence that opens on a list item line', () => {
    const body = '- ```js\n  const a = 1;\n  ```\n\n1. ~~~\n   x\n   ~~~\n\nProse after.';
    const { masked, blocks } = maskBlocks(body);
    expect(masked).toBe('- @@BLOCK_0@@\n\n1. @@BLOCK_1@@\n\nProse after.');
    expect(unmaskBlocks(masked, blocks)).toBe(body);
  });

  test('an unclosed fence runs to the end', () => {
    const { masked, blocks } = maskBlocks('Text\n\n```\ncode\nmore');
    expect(masked).toBe('Text\n\n@@BLOCK_0@@');
    expect(unmaskBlocks(masked, blocks)).toBe('Text\n\n```\ncode\nmore');
  });
});

describe('splitIntoChunks', () => {
  test('keeps a short document whole', () => {
    expect(splitIntoChunks('# A\n\ntext\n\n## B\n\nmore')).toEqual(['# A\n\ntext\n\n## B\n\nmore']);
  });

  test('splits at ## headings without losing a line', () => {
    const doc = ['Intro', '', '## One', 'x'.repeat(30), '', '## Two', 'y'.repeat(30), '', '## Three', 'z'].join('\n');
    const chunks = splitIntoChunks(doc, 50);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.slice(1).every((chunk) => chunk.startsWith('## '))).toBe(true);
    expect(chunks.join('\n')).toBe(doc);
  });
});

describe('unwrapModelOutput', () => {
  test('drops reasoning and a fence around the whole reply', () => {
    expect(unwrapModelOutput('<think>plan</think>\n\n```markdown\n# 标题\n\n正文\n```\n')).toBe('# 标题\n\n正文');
    expect(unwrapModelOutput('# 标题\n\n正文\n')).toBe('# 标题\n\n正文');
  });
});

describe('compareStructure', () => {
  const SOURCE = [
    '## Setup',
    '',
    'See [the guide](./guide/) and ![a chart](./chart.png "Chart").',
    'Run `bun dev`, link [[getting-started|Getting started]], press <kbd>F</kbd>.',
    '',
    '@@BLOCK_0@@',
    '',
    ':::slides[My Talk]{video="https://youtu.be/x"}',
    '![Slide](./slides/1.png)',
    ':::',
    '',
    'Footnote.[^1]',
    '',
    '[^1]: A note that gets translated.',
  ].join('\n');
  const GOOD = [
    '## 设置',
    '',
    '参见[指南](./guide/)和![图表](./chart.png "图表")。',
    '运行 `bun dev`，链接 [[getting-started|入门]]，按 <kbd>F</kbd>。',
    '',
    '@@BLOCK_0@@',
    '',
    ':::slides[我的演讲]{video="https://youtu.be/x"}',
    '![幻灯片](./slides/1.png)',
    ':::',
    '',
    '脚注。[^1]',
    '',
    '[^1]: 一条被翻译的脚注。',
  ].join('\n');

  test('accepts a translation that keeps the structure', () => {
    expect(compareStructure(SOURCE, GOOD, 1)).toEqual([]);
  });

  test('reports what changed', () => {
    const cases: Array<[string, string]> = [
      [GOOD.replace('@@BLOCK_0@@', ''), 'code/math placeholders: missing @@BLOCK_0@@'],
      [GOOD.replace('@@BLOCK_0@@', '@@BLOCK_0@@\n@@BLOCK_0@@'), 'code/math placeholders: unexpected @@BLOCK_0@@'],
      [GOOD.replace('## 设置', '### 设置'), 'headings: missing h2; unexpected h3'],
      [GOOD.replace('./guide/', './指南/'), 'link and image URLs: missing ./guide/; unexpected ./指南/'],
      [GOOD.replace('getting-started|', '入门指南|'), 'wikilink targets: missing getting-started; unexpected 入门指南'],
      [GOOD.replace('`bun dev`', '`bun 开发`'), 'inline code: missing `bun dev`; unexpected `bun 开发`'],
      [GOOD.replace('{video="https://youtu.be/x"}', ''), '::: directives: missing :::slides{video="https://youtu.be/x"}; unexpected :::slides'],
      [GOOD.replace('<kbd>F</kbd>', 'F'), 'HTML tags: missing <kbd, </kbd'],
    ];
    for (const [output, problem] of cases) {
      expect(compareStructure(SOURCE, output, 1)).toEqual([problem]);
    }
  });
});

test('compareStructure catches a changed HTML asset URL', () => {
  expect(compareStructure('<img src="./chart.png" />', '<img src="./图表.png" />', 0))
    .toEqual(['HTML URLs: missing src=./chart.png; unexpected src=./图表.png']);
  expect(compareStructure('<video poster="p.jpg"></video>', '<video poster="p.jpg"></video>', 0)).toEqual([]);
});

describe('danglingAnchors', () => {
  test('lists in-page links whose heading id changed with the translation', () => {
    const source = '## Code Groups\n\nSee [groups](#code-groups) and [slide 2](#slides-2).';
    const output = '## 代码组\n\n参见[代码组](#code-groups)和[第 2 张](#slides-2)。';
    expect(danglingAnchors(source, output)).toEqual(['code-groups']);
    expect(danglingAnchors(source, source)).toEqual([]);
  });
});

describe('parseFieldTranslations', () => {
  test('reads a JSON array of the expected length, fenced or not', () => {
    expect(parseFieldTranslations('```json\n["标题", "摘要"]\n```', 2)).toEqual(['标题', '摘要']);
    expect(parseFieldTranslations('Here you go: ["标题"]', 1)).toEqual(['标题']);
  });

  test('refuses anything else', () => {
    expect(() => parseFieldTranslations('["标题"]', 2)).toThrow('JSON array of 2 strings');
    expect(() => parseFieldTranslations('标题', 1)).toThrow('JSON array of 1 string');
  });
});

describe('series and book lists', () => {
  test('reads the slugs a series index and the ids a book index list', () => {
    expect(listedSeriesPosts({ posts: ['01-intro', '02-next'] })).toEqual(['01-intro', '02-next']);
    expect(listedSeriesPosts({})).toEqual([]);
    expect(listedBookChapters({
      chapters: [{ part: 'I', chapters: [{ title: 'A', id: 'a' }, { title: 'B', id: 'b' }] }, { title: 'C', id: 'c' }],
    })).toEqual(['a', 'b', 'c']);
    expect(listedBookChapters({
      chapters: [{ section: 'S', items: [{ title: 'A', id: 'a' }, { section: 'T', items: [{ title: 'B', id: 'b' }] }] }],
    })).toEqual(['a', 'b']);
    expect(seriesPostSlug('2026-01-02-hello.mdx')).toBe('hello');
    expect(seriesPostSlug('02-routing-mastery')).toBe('02-routing-mastery');
  });
});
