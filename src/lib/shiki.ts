import {
  bundledLanguages,
  bundledLanguagesInfo,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
  type ShikiTransformer,
} from 'shiki';
import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
} from '@shikijs/transformers';
import type { Root } from 'hast';

export const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

// Discovery from Shiki's own metadata, not a hand-maintained list. `bundledLanguagesInfo`
// gives us every canonical id, its proper-case display name, and the aliases Shiki natively
// understands (e.g. ts/cts/mts → typescript). Building ALIAS_MAP and DISPLAY_MAP once at
// module init lets us resolve any of Shiki's ~235 bundled languages without curating a list.
const ALIAS_MAP: Record<string, string> = {};
const DISPLAY_MAP: Record<string, string> = {};
for (const info of bundledLanguagesInfo) {
  ALIAS_MAP[info.id] = info.id;
  DISPLAY_MAP[info.id] = info.name ?? info.id;
  for (const alias of info.aliases ?? []) {
    ALIAS_MAP[alias] = info.id;
  }
}

// Amytis-specific overlay. `plaintext` is Shiki's built-in "special" language (always
// available without a grammar load), but Shiki doesn't list it in bundledLanguagesInfo,
// so we register it explicitly. The empty-string fence (```\n...\n```) maps to plaintext
// too. svg/plain/text/txt are our own conventional aliases.
const PLAINTEXT_DISPLAY = 'Plain text';
ALIAS_MAP['plaintext'] = 'plaintext';
ALIAS_MAP['text'] = 'plaintext';
ALIAS_MAP['txt'] = 'plaintext';
ALIAS_MAP['plain'] = 'plaintext';
ALIAS_MAP[''] = 'plaintext';
ALIAS_MAP['svg'] = ALIAS_MAP['xml'] ?? 'xml';
DISPLAY_MAP['plaintext'] = PLAINTEXT_DISPLAY;

// Community aliases Shiki doesn't ship as official aliases in bundledLanguagesInfo.
// Each entry maps a name authors commonly write to a verified-bundled canonical id.
// Slow-growing list — Shiki's official aliases cover most cases. Extend here when a
// build hits an unknown-lang throw for a real community-name alias (not a typo).
const COMMUNITY_ALIASES: Record<string, string> = {
  golang: 'go',                  // `go` ships without `golang` in Shiki's aliases
  node: 'javascript',            // node code snippets routinely written as ```node
  nodejs: 'javascript',
  'obj-c': 'objective-c',        // Shiki ships `objc` and `objective-c` but not `obj-c`
  gnumakefile: 'make',           // GNU/BSD-disambiguated makefile names
  bsdmakefile: 'make',
};
for (const [alias, canonical] of Object.entries(COMMUNITY_ALIASES)) {
  ALIAS_MAP[alias] = canonical;
}

function resolveCanonical(language: string): string | null {
  const key = (language || '').toLowerCase();
  return ALIAS_MAP[key] ?? null;
}

export function getLanguageDisplayName(language: string): string {
  const canonical = resolveCanonical(language);
  if (canonical && DISPLAY_MAP[canonical]) return DISPLAY_MAP[canonical];
  // Defensive — highlightToHast throws on unknown langs, so this branch
  // shouldn't trigger at render time. Returns the raw input for safety.
  return language;
}

declare global {
  var __amytisShikiHighlighter: Promise<Highlighter> | undefined;
}

export function getHighlighter(): Promise<Highlighter> {
  if (!globalThis.__amytisShikiHighlighter) {
    // Preload only `plaintext` — Shiki's special always-available lang. Every other
    // bundled grammar is loaded lazily on first use via ensureLanguageLoaded below.
    // Drastically smaller cold-start than eagerly loading 20+ grammars.
    globalThis.__amytisShikiHighlighter = createHighlighter({
      themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
      langs: ['plaintext'],
    });
  }
  return globalThis.__amytisShikiHighlighter;
}

export function resetHighlighterForTests(): void {
  globalThis.__amytisShikiHighlighter = undefined;
}

async function ensureLanguageLoaded(highlighter: Highlighter, canonical: string): Promise<void> {
  if (canonical === 'plaintext') return; // Shiki's special lang — always available.
  if (highlighter.getLoadedLanguages().includes(canonical)) return;
  const loader = bundledLanguages[canonical as BundledLanguage];
  if (!loader) return; // Defensive — shouldn't happen since resolveCanonical gates entry.
  await highlighter.loadLanguage(loader);
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

// Module-level dedup so we don't spam build logs when the same unknown lang
// appears in many posts. Reset between processes; not a leak across builds.
const warnedUnknownLangs = new Set<string>();

export function resetUnknownLangWarningsForTests(): void {
  warnedUnknownLangs.clear();
}

export async function highlightToHast(
  code: string,
  language: string,
  opts: HighlightOpts = {},
): Promise<Root> {
  const canonical = resolveCanonical(language);
  // Soft fallback for unknown fence languages: render as plaintext + warn (deduped).
  // The CLAUDE.md "strict build over silent runtime failure" principle is correct
  // for structural misconfiguration (frontmatter, slugs, redirects), but wrong here:
  // "typo" and "community alias" look identical from our side, and Shiki's alias
  // coverage is narrower than what blog authors routinely write. Failing a whole
  // production deploy because one fence used `\`\`\`golang` is worse than the block
  // rendering as monochrome monospace with a build-time warn. Authors running a
  // clean local build still see real typos in the warn output.
  if (!canonical && language && !warnedUnknownLangs.has(language)) {
    warnedUnknownLangs.add(language);
    console.warn(
      `[shiki] Unknown code-block language "${language}" — rendering as plaintext. To fix highlighting, add an entry to COMMUNITY_ALIASES in src/lib/shiki.ts, or use a recognized name. Use \`plaintext\` explicitly to silence this warning.`,
    );
  }

  const lang = canonical ?? 'plaintext';
  const highlighter = await getHighlighter();
  await ensureLanguageLoaded(highlighter, lang);

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
