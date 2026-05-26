import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';
import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers';
import type { Root } from 'hast';

export const SHIKI_LANGS = [
  'tsx',
  'typescript',
  'javascript',
  'bash',
  'markdown',
  'json',
  'css',
  'python',
  'rust',
  'go',
  'c',
  'cpp',
  'java',
  'ruby',
  'sql',
  'yaml',
  'diff',
  'html',
  'xml',
  'nginx',
  'haskell',
  'ocaml',
  'plaintext',
] as const;
export type ShikiLang = (typeof SHIKI_LANGS)[number];

export const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

const LANG_ALIASES: Record<string, ShikiLang> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'tsx',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  md: 'markdown',
  py: 'python',
  golang: 'go',
  'c++': 'cpp',
  rb: 'ruby',
  yml: 'yaml',
  text: 'plaintext',
  txt: 'plaintext',
  plain: 'plaintext',
  '': 'plaintext',
  svg: 'xml',
};

const SHIKI_LANG_SET = new Set<string>(SHIKI_LANGS);

export function normalizeLang(language: string): { lang: ShikiLang; recognized: boolean } {
  const lower = (language || '').toLowerCase();
  if (lower in LANG_ALIASES) return { lang: LANG_ALIASES[lower], recognized: true };
  if (SHIKI_LANG_SET.has(lower)) return { lang: lower as ShikiLang, recognized: true };
  return { lang: 'plaintext', recognized: false };
}

declare global {
  var __amytisShikiHighlighter: Promise<Highlighter> | undefined;
}

export function getHighlighter(): Promise<Highlighter> {
  if (!globalThis.__amytisShikiHighlighter) {
    globalThis.__amytisShikiHighlighter = createHighlighter({
      themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
      langs: [...SHIKI_LANGS],
    });
  }
  return globalThis.__amytisShikiHighlighter;
}

export function resetHighlighterForTests(): void {
  globalThis.__amytisShikiHighlighter = undefined;
}

export interface ParsedFenceMeta {
  title?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  tabLabel?: string;
  raw?: string;
}

export function parseFenceMeta(meta: string | undefined | null): ParsedFenceMeta {
  if (!meta) return {};
  const result: ParsedFenceMeta = { raw: meta };

  // Docusaurus-style [label] at the start of the meta — used by tabbed code groups
  // to name each tab. Stays harmlessly attached to non-grouped blocks too. Square
  // brackets are unambiguous against the curly-brace {1,3-5} highlight syntax.
  const labelMatch = meta.match(/^\s*\[([^\]]+)\]/);
  if (labelMatch) {
    // Trim and discard if empty — `[   ]` would otherwise leak an empty-string
    // label that bypasses downstream `?? language` fallbacks (empty isn't nullish).
    const label = labelMatch[1].trim();
    if (label) result.tabLabel = label;
  }

  const titleMatch = meta.match(/title=(?:"([^"]*)"|'([^']*)')/);
  if (titleMatch) result.title = titleMatch[1] ?? titleMatch[2] ?? '';

  if (/(?:^|\s)(linenos|showLineNumbers)(?=\s|$)/.test(meta)) {
    result.showLineNumbers = true;
  }

  const highlightMatch = meta.match(/\{([\d,\s-]+)\}/);
  if (highlightMatch) {
    const expanded = expandLineRanges(highlightMatch[1]);
    if (expanded.length > 0) result.highlightLines = expanded;
  }

  return result;
}

export function expandLineRanges(spec: string): number[] {
  const seen = new Set<number>();
  for (const raw of spec.split(',')) {
    const piece = raw.trim();
    if (!piece) continue;
    const range = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let i = lo; i <= hi; i++) seen.add(i);
    } else if (/^\d+$/.test(piece)) {
      seen.add(Number(piece));
    }
  }
  return [...seen].sort((a, b) => a - b);
}

function ensureClassList(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string').join(' ');
  return '';
}

function addClass(node: { properties?: Record<string, unknown> }, cls: string): void {
  node.properties = node.properties ?? {};
  const existing = ensureClassList(node.properties.class);
  node.properties.class = existing ? `${existing} ${cls}` : cls;
}

function setProperty(
  node: { properties?: Record<string, unknown> },
  key: string,
  value: string,
): void {
  node.properties = node.properties ?? {};
  node.properties[key] = value;
}

function transformerLineNumbers(enabled: boolean): ShikiTransformer {
  return {
    name: 'amytis:line-numbers',
    pre(node) {
      if (enabled) setProperty(node, 'data-line-numbers', 'true');
    },
  };
}

function transformerTitle(title?: string): ShikiTransformer {
  return {
    name: 'amytis:title',
    pre(node) {
      if (title) setProperty(node, 'data-title', title);
    },
  };
}

function transformerHighlightLines(lines: number[] | undefined): ShikiTransformer {
  const set = new Set(lines ?? []);
  return {
    name: 'amytis:highlight-lines',
    line(node, lineIdx) {
      if (set.has(lineIdx)) {
        addClass(node, 'highlighted');
        setProperty(node, 'data-highlighted-line', String(lineIdx));
      }
    },
  };
}

function transformerDiffBg(lang: string, source: string): ShikiTransformer {
  if (lang !== 'diff') return { name: 'amytis:diff-bg-noop' };
  const lines = source.split('\n');
  return {
    name: 'amytis:diff-bg',
    line(node, lineIdx) {
      const text = lines[lineIdx - 1] ?? '';
      if (text.startsWith('+') && !text.startsWith('+++')) {
        addClass(node, 'diff add');
      } else if (text.startsWith('-') && !text.startsWith('---')) {
        addClass(node, 'diff remove');
      }
    },
  };
}

export interface HighlightOpts {
  showLineNumbers?: boolean;
  highlightLines?: number[];
  title?: string;
}

export async function highlightToHast(
  code: string,
  language: string,
  opts: HighlightOpts = {},
): Promise<Root> {
  const { lang, recognized } = normalizeLang(language);
  // Strict build per CLAUDE.md "strict build over silent runtime failure": a typo'd
  // or unsupported fence language is misconfiguration. Throwing here surfaces it at
  // build time with a clear error rather than silently shipping degraded plaintext
  // output. To genuinely render as plaintext, write the fence as `plaintext` (or
  // `text`/`txt`/`plain`, which alias to it).
  if (!recognized && language) {
    throw new Error(
      `[shiki] Unknown code-block language "${language}". Add it to SHIKI_LANGS or LANG_ALIASES in src/lib/shiki.ts, or use a recognized language. Use \`plaintext\` for unhighlighted content.`,
    );
  }

  const highlighter = await getHighlighter();
  return highlighter.codeToHast(code, {
    lang,
    themes: SHIKI_THEMES,
    defaultColor: false,
    transformers: [
      transformerLineNumbers(!!opts.showLineNumbers),
      transformerTitle(opts.title),
      transformerHighlightLines(opts.highlightLines),
      transformerDiffBg(lang, code),
      // VitePress-style notation comments inside the source:
      //   // [!code focus]         dim/blur non-focused lines (hover to reveal)
      //   // [!code error]         red line tinting
      //   // [!code warning]       amber line tinting
      //   // [!code highlight]     same .highlighted class as the meta {1,3-5} syntax
      //   // [!code ++] / [!code --] same .diff.add / .diff.remove classes as the
      //                            raw +/- transformer in diff fences; they coexist.
      // The class names emitted (.focused/.error/.warning/.highlighted/.diff.add/.diff.remove)
      // are styled by globals.css alongside our existing rules.
      transformerNotationFocus({ classActivePre: 'has-focused' }),
      transformerNotationErrorLevel(),
      transformerNotationHighlight(),
      transformerNotationDiff(),
    ],
  });
}
