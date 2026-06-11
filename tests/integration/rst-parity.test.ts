import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { parseRstDocument } from '../../src/lib/rst';
import {
  renderRstFile,
  resetPythonCommandSpecForTests,
  resetRstRendererCachesForTests,
} from '../../src/lib/rst-renderer';

// Contract test: the Python docutils path and the JS fallback path normalize
// docinfo through the shared rst-metadata module, so the same document must
// yield the same metadata regardless of which renderer was available.
//
// Runs only when the local docutils venv exists (same gate as rst-renderer.test.ts).
const localDocutilsPython = path.join(process.cwd(), '.venv-rst', 'bin', 'python');
const hasLocalDocutils = existsSync(localDocutilsPython);
const parityTest = hasLocalDocutils ? test : test.skip;
const previousPython = process.env.AMYTIS_RST_PYTHON;

const fixturePath = path.join(process.cwd(), 'content', 'series', 'rst-legacy', 'getting-started.rst');

beforeAll(() => {
  resetPythonCommandSpecForTests();
  resetRstRendererCachesForTests();
  if (hasLocalDocutils && previousPython === undefined) {
    process.env.AMYTIS_RST_PYTHON = localDocutilsPython;
  }
});

afterAll(() => {
  if (previousPython === undefined) {
    delete process.env.AMYTIS_RST_PYTHON;
  } else {
    process.env.AMYTIS_RST_PYTHON = previousPython;
  }
  rmSync(path.join(process.cwd(), '.cache', 'rst-renderer'), { recursive: true, force: true });
  resetRstRendererCachesForTests();
  resetPythonCommandSpecForTests();
});

describe('Integration: rST renderer parity (Python vs JS fallback)', () => {
  parityTest('both paths produce identical metadata for the same document', () => {
    const jsDoc = parseRstDocument(readFileSync(/* turbopackIgnore: true */ fixturePath, 'utf8'));
    const pyDoc = renderRstFile(fixturePath, 'posts/getting-started');

    expect(pyDoc.metadata).toEqual(jsDoc.metadata);
    expect(jsDoc.metadata).toEqual({
      date: '2026-01-03',
      excerpt: 'A simple rST-based post inside a legacy series.',
      category: 'Legacy',
      tags: ['rst', 'migration'],
      authors: ['John Hu'],
      redirectFrom: ['/posts/getting-started-rst'],
    });
  });

  parityTest('both paths agree on the title', () => {
    const jsDoc = parseRstDocument(readFileSync(/* turbopackIgnore: true */ fixturePath, 'utf8'));
    const pyDoc = renderRstFile(fixturePath, 'posts/getting-started');

    expect(pyDoc.title).toBe(jsDoc.title);
  });

  parityTest('heading extraction is a KNOWN divergence between the two paths', () => {
    // The Python path extracts headings from the docutils AST (authoritative).
    // The JS fallback regex-scans its rST→Markdown conversion for `##`/`###`
    // markers and currently finds NONE for underline-adorned sections in this
    // fixture — i.e. the fallback's heading list can be empty or partial.
    // This test pins that asymmetry: every heading the fallback does find
    // must exist in the docutils list, and docutils must always see the
    // document's sections. If the lists ever become identical, tighten this
    // to a full deep-equal.
    const jsDoc = parseRstDocument(readFileSync(/* turbopackIgnore: true */ fixturePath, 'utf8'));
    const pyDoc = renderRstFile(fixturePath, 'posts/getting-started');

    expect(pyDoc.headings.length).toBeGreaterThan(0);
    const pyTexts = new Set(pyDoc.headings.map((h) => h.text));
    for (const heading of jsDoc.headings) {
      expect(pyTexts.has(heading.text)).toBe(true);
    }
  });
});
