import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkSite,
  formatReport,
  pageUrlFor,
  resolveInternal,
  scanPage,
  shouldFail,
  targetFile,
  type LinkReport,
} from '../../scripts/check-links';

const createdDirs: string[] = [];

afterEach(() => {
  for (const dir of createdDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A miniature export: file path → contents. */
function makeSite(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amytis-links-'));
  createdDirs.push(dir);
  for (const [file, contents] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), contents, 'utf8');
  }
  return dir;
}

const page = (body: string, head = '') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const SITE_HOST = 'site.test';

const emptyReport = (): LinkReport => ({
  pages: 1,
  checkedLinks: 1,
  brokenLinks: [],
  missingImages: [],
  brokenWikilinks: [],
  missingAnchors: [],
  redirectLinks: [],
});

describe('resolveInternal', () => {
  test('site paths, relative paths and own-host URLs are internal; query dropped, fragment kept and decoded', () => {
    expect(resolveInternal('/about/', '/', SITE_HOST)).toEqual({ path: '/about/', fragment: '' });
    expect(resolveInternal('./y/', '/blog/x/', SITE_HOST)).toEqual({ path: '/blog/x/y/', fragment: '' });
    expect(resolveInternal('../', '/blog/x/', SITE_HOST)).toEqual({ path: '/blog/', fragment: '' });
    expect(resolveInternal('/a/?collection=s#Team', '/', SITE_HOST)).toEqual({ path: '/a/', fragment: 'Team' });
    expect(resolveInternal('https://site.test/a/', '/', SITE_HOST)).toEqual({ path: '/a/', fragment: '' });
    expect(resolveInternal('/%E4%B8%AD%E6%96%87/#%E6%A0%87', '/', SITE_HOST)).toEqual({ path: '/中文/', fragment: '标' });
  });

  test('other hosts, mail and script schemes, and bare "#" are skipped', () => {
    for (const href of ['https://example.com/a', '//cdn.example.com/x.js', 'mailto:a@b.c', 'tel:123', 'javascript:void(0)', '#', '']) {
      expect(resolveInternal(href, '/', SITE_HOST)).toBeNull();
    }
  });
});

describe('targetFile and pageUrlFor', () => {
  const files = new Set(['index.html', 'about/index.html', 'feed.xml', 'legacy.html']);

  test('a path resolves to the file the static host would serve', () => {
    expect(targetFile('/', files)).toBe('index.html');
    expect(targetFile('/about/', files)).toBe('about/index.html');
    expect(targetFile('/about', files)).toBe('about/index.html');
    expect(targetFile('/feed.xml', files)).toBe('feed.xml');
    expect(targetFile('/legacy', files)).toBe('legacy.html');
    expect(targetFile('/missing/', files)).toBeNull();
  });

  test('falls back to the disk check (case-insensitive filesystems)', () => {
    expect(targetFile('/About/', files, (file) => file === 'About/index.html')).toBe('About/index.html');
  });

  test('page files map back to their URL', () => {
    expect(pageUrlFor('index.html')).toBe('/');
    expect(pageUrlFor('posts/a/index.html')).toBe('/posts/a/');
    expect(pageUrlFor('404.html')).toBe('/404.html');
  });
});

describe('scanPage', () => {
  test('collects links, images, ids, broken wikilinks and redirects, ignoring inline scripts', () => {
    const scan = scanPage(
      page(
        `<h2 id="intro">Intro</h2><a name="old-anchor"></a>
         <a href="/a/">a</a><img src="/i.png" alt="">
         <span class="wikilink wikilink--broken" title="[[future-note]] not found">future</span>
         <script>self.__next_f.push(["<a href=\\"/inside-script/\\">"])</script>
         <pre><code>&lt;a href="/in-code/"&gt;</code></pre>`,
        '<meta http-equiv="refresh" content="0;url=/new/">',
      ),
    );
    expect(scan.links).toEqual(['/a/']);
    expect(scan.images).toEqual(['/i.png']);
    expect([...scan.ids].sort()).toEqual(['intro', 'old-anchor']);
    expect(scan.brokenWikilinks).toEqual(['future-note']);
    expect(scan.redirectTo).toBe('/new/');
  });
});

describe('checkSite', () => {
  const site = () =>
    makeSite({
      'index.html': page(`
        <a href="/about/">ok</a><a href="/about">ok, no slash</a><a href="/missing/">broken</a>
        <a href="/%E4%B8%AD%E6%96%87/">unicode</a>
        <a href="/about/?collection=x#team">anchor ok</a><a href="/about/#nope">anchor missing</a>
        <a href="https://site.test/about/">own host</a><a href="https://site.test/gone/">own host broken</a>
        <a href="https://example.com/x">external</a><a href="mailto:a@b.c">mail</a>
        <a href="#local">same page</a><a href="#absent">same page missing</a><span id="local"></span>
        <a href="/old/">alias</a><a href="/images/">a directory with no index.html</a>
        <a href="/feed.xml/">a path through a file</a>
        <img src="/images/a.png" alt=""><img src="/images/missing.png" alt="">
        <img src="/images/nextImageExportOptimizer/b-opt-1920.WEBP" alt="">
        <img src="/images/nextImageExportOptimizer/c-opt-640.WEBP" alt="">
        <img src="https://cdn.example.com/x.png" alt="">
        <span class="wikilink wikilink--broken" title="[[nowhere]] not found">nowhere</span>`),
      'about/index.html': page('<h2 id="team">Team</h2>'),
      '中文/index.html': page('中文'),
      'old/index.html': page('<a href="/about/">moved</a>', '<meta http-equiv="refresh" content="0;url=/about/">'),
      'blog/index.html': page('blog'),
      'blog/x/index.html': page('<a href="../">up</a><a href="./y/">down, broken</a>'),
      'feed.xml': '<rss/>',
      'images/a.png': 'png',
      'images/b.jpg': 'jpg',
    });

  test('reports each category once per page and target', () => {
    const report = checkSite(site(), { siteHost: SITE_HOST });
    expect(report.pages).toBe(6);
    // Pages are scanned in sorted file order: blog/x/index.html before index.html.
    expect(report.brokenLinks).toEqual([
      { page: '/blog/x/', target: './y/' },
      { page: '/', target: '/missing/' },
      { page: '/', target: 'https://site.test/gone/' },
      { page: '/', target: '/images/' },
      { page: '/', target: '/feed.xml/' },
    ]);
    expect(report.missingImages).toEqual([
      { page: '/', target: '/images/missing.png' },
      { page: '/', target: '/images/nextImageExportOptimizer/c-opt-640.WEBP' },
    ]);
    expect(report.missingAnchors).toEqual([
      { page: '/', target: '/about/#nope' },
      { page: '/', target: '#absent' },
    ]);
    expect(report.brokenWikilinks).toEqual([{ page: '/', target: '[[nowhere]]' }]);
    expect(report.redirectLinks).toEqual([{ page: '/', target: '/old/' }]);
  });
});

describe('checkSite: redirect loops', () => {
  test('a link to a stub that redirects to itself is broken, not an alias hop', () => {
    // What a case-insensitive filesystem leaves when /authors/Amytis/ (a
    // legacy stub to /authors/amytis/) overwrites /authors/amytis/.
    const dir = makeSite({
      'index.html': page('<a href="/authors/amytis/">author</a>'),
      'authors/amytis/index.html': page('<a href="#main-content">skip</a>', '<meta http-equiv="refresh" content="0;url=/authors/amytis/">'),
    });
    const report = checkSite(dir, { siteHost: SITE_HOST });
    // Reported where it's linked from, not again for the stub's own skip link.
    expect(report.brokenLinks).toEqual([{ page: '/', target: '/authors/amytis/ (redirects to itself)' }]);
    expect(report.redirectLinks).toEqual([]);
  });
});

describe('shouldFail', () => {
  test('only error mode fails, and only on broken links or missing images', () => {
    const broken = { ...emptyReport(), brokenLinks: [{ page: '/', target: '/x/' }] };
    const image = { ...emptyReport(), missingImages: [{ page: '/', target: '/i.png' }] };
    const soft = {
      ...emptyReport(),
      brokenWikilinks: [{ page: '/', target: '[[x]]' }],
      missingAnchors: [{ page: '/', target: '#a' }],
      redirectLinks: [{ page: '/', target: '/old/' }],
    };
    expect(shouldFail(broken, 'error')).toBe(true);
    expect(shouldFail(image, 'error')).toBe(true);
    expect(shouldFail(soft, 'error')).toBe(false);
    expect(shouldFail(broken, 'warn')).toBe(false);
    expect(shouldFail(broken, 'off')).toBe(false);
  });
});

describe('formatReport', () => {
  test('a clean site says so', () => {
    expect(formatReport(emptyReport())).toBe('[links] checked 1 internal links on 1 pages\n[links] no problems found');
  });

  test('summarizes per category, names the source file, and caps the detail lines', () => {
    const report = {
      ...emptyReport(),
      brokenLinks: [
        { page: '/a/', target: '/x/' },
        { page: '/a/', target: '/y/' },
        { page: '/b/', target: '/x/' },
      ],
    };
    const full = formatReport(report, { sources: new Map([['/a/', 'content/posts/a.mdx']]) });
    expect(full).toContain('[links] 3 broken links on 2 pages');
    expect(full).toContain('  broken link: content/posts/a.mdx (/a/)\n    → /x/\n    → /y/');
    expect(full).toContain('  broken link: /b/\n    → /x/');

    const capped = formatReport(report, { limit: 2 });
    expect(capped).toContain('… 3 more lines; run `bun run check-links --all` for the full list');
    expect(capped).not.toContain('/b/');
  });
});
