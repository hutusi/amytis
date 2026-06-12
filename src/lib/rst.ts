import GithubSlugger from 'github-slugger';
import {
  calculateReadingMinutes,
  calculateWordCount,
  getHeadings,
  type Heading,
} from './text-metrics';

import { normalizeRstMetadataField, RstParseError, type RstMetadata } from './rst-metadata';

export type RstHeading = Heading;

// The metadata shape, per-field validators, and error type are shared with
// the Python renderer path via rst-metadata.ts; re-exported here so rst.ts
// stays the public seam for rST consumers.
export { RstParseError, type RstMetadata };

export interface ParsedRstDocument {
  title: string;
  body: string;
  markdownBody: string;
  metadata: RstMetadata;
  headings: RstHeading[];
  excerpt: string;
  readingMinutes: number;
  wordCount: number;
}

function normalizeLines(source: string): string[] {
  return source.replace(/\r\n?/g, '\n').split('\n');
}

function isAdornmentLine(line: string): boolean {
  const trimmed = line.trim();
  return /^([=\-~^"`+#*])\1{2,}$/.test(trimmed);
}

function extractTitle(lines: string[]): { title: string; titleIndex: number; nextIndex: number } {
  for (let i = 0; i + 1 < lines.length; i++) {
    const titleLine = lines[i].trim();
    const underline = lines[i + 1].trim();

    if (!titleLine) continue;
    if (/^\s/.test(lines[i])) continue;
    if (!isAdornmentLine(underline)) continue;

    return { title: titleLine, titleIndex: i, nextIndex: i + 2 };
  }

  throw new RstParseError('Missing top-level rST title.');
}

function extractMetadata(lines: string[], startIndex: number): { metadata: RstMetadata; nextIndex: number } {
  const metadata: RstMetadata = {};
  let i = startIndex;
  while (i < lines.length && !lines[i].trim()) i++;

  while (i < lines.length) {
    const match = lines[i].match(/^:([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) break;

    const field = match[1];
    const continuation: string[] = [match[2]];
    i++;

    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (/^:([A-Za-z][\w-]*):\s*(.*)$/.test(next)) break;
      if (/^\s+/.test(next)) {
        continuation.push(next.trim());
        i++;
        continue;
      }
      break;
    }

    normalizeRstMetadataField(metadata, field, continuation.join(' ').trim());

    if (i < lines.length && !lines[i].trim()) {
      i++;
      if (i < lines.length && !/^:([A-Za-z][\w-]*):\s*(.*)$/.test(lines[i])) break;
    }
  }

  while (i < lines.length && !lines[i].trim()) i++;
  return { metadata, nextIndex: i };
}

function extractPreambleMetadata(lines: string[]): RstMetadata {
  const metadata: RstMetadata = {};

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^:([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) continue;

    const field = match[1];
    const continuation: string[] = [match[2]];
    i++;

    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (/^:([A-Za-z][\w-]*):\s*(.*)$/.test(next)) {
        i--;
        break;
      }
      if (/^\s+/.test(next)) {
        continuation.push(next.trim());
        i++;
        continue;
      }
      i--;
      break;
    }

    normalizeRstMetadataField(metadata, field, continuation.join(' ').trim());
  }

  return metadata;
}

function mergeMetadata(base: RstMetadata, override: RstMetadata): RstMetadata {
  return {
    ...base,
    ...override,
    tags: override.tags ?? base.tags,
    authors: override.authors ?? base.authors,
    posts: override.posts ?? base.posts,
    redirectFrom: override.redirectFrom ?? base.redirectFrom,
  };
}

function slugifyAnchor(target: string): string {
  return new GithubSlugger().slug(target.trim());
}

function convertInlineRst(text: string): string {
  return text
    .replace(/\\([ \t])/g, '')
    .replace(/``([^`]+)``/g, '`$1`')
    .replace(
      /:ref:`([^<`]+?)\s*<([^>`]+)>`/g,
      (_, title: string, target: string) => `[${title.trim()}](#${slugifyAnchor(target)})`,
    )
    .replace(
      /:ref:`([^`]+)`/g,
      (_, target: string) => `[${target.trim()}](#${slugifyAnchor(target)})`,
    )
    .replace(
      /:numref:`([^<`]+?)\s*<([^>`]+)>`/g,
      (_, title: string, target: string) => {
        const label = title.replace(/%s/g, '').trim() || target.trim();
        return `[${label}](#${slugifyAnchor(target)})`;
      },
    )
    .replace(
      /:numref:`([^`]+)`/g,
      (_, target: string) => `[${target.trim()}](#${slugifyAnchor(target)})`,
    )
    .replace(
      /:doc:`([^<`]+?)\s*<([^>`]+)>`/g,
      (_, title: string, target: string) => `[${title.trim()}](${target.trim()})`,
    )
    .replace(
      /:doc:`([^`]+)`/g,
      (_, target: string) => {
        const trimmed = target.trim();
        return `[${trimmed}](${trimmed})`;
      },
    )
    .replace(/`([^`]+?)\s*<([^>]+)>`__/g, '[$1]($2)')
    .replace(/`([^`]+?)\s*<([^>]+)>`_/g, '[$1]($2)');
}

function detectHeadingLevel(adornment: string): number | null {
  const marker = adornment.trim()[0];
  if (marker === '=') return 2;
  if (marker === '-' || marker === '~' || marker === '^') return 3;
  return null;
}

interface DirectiveCodeOptions {
  language?: string;
  caption?: string;
  linenos?: boolean;
  emphasizeLines?: string;
  label?: string;
}

function readDirectiveOptions(
  lines: string[],
  startIndex: number,
): { options: DirectiveCodeOptions; nextLine: number } {
  const options: DirectiveCodeOptions = {};
  let i = startIndex;
  while (i < lines.length) {
    const match = lines[i].match(/^\s+:([A-Za-z-]+):\s*(.*)$/);
    if (!match) break;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'language') options.language = value;
    else if (key === 'caption') options.caption = value;
    else if (key === 'linenos') options.linenos = true;
    else if (key === 'emphasize-lines') options.emphasizeLines = value;
    else if (key === 'label') options.label = value;
    i++;
  }
  // Skip the blank line separator that always follows the option block.
  while (i < lines.length && !lines[i].trim()) i++;
  return { options, nextLine: i };
}

function buildFenceMetaFromOptions(options: DirectiveCodeOptions): string[] {
  const meta: string[] = [];
  // [label] must be the FIRST token after the language for the MDX-side
  // parseFenceMeta + remark-code-group plugin to pick it up.
  if (options.label) meta.push(`[${options.label}]`);
  if (options.caption) meta.push(`title="${options.caption.replace(/"/g, '\\"')}"`);
  if (options.linenos) meta.push('linenos');
  if (options.emphasizeLines) meta.push(`{${options.emphasizeLines}}`);
  return meta;
}

function convertNestedCodeBlocksToFences(body: string[]): string[] {
  // Used by the .. code-group:: fallback path. Walks the indented body lines
  // (already dedented to the directive's body indent) and emits Markdown
  // fences for each nested .. code-block:: child. Anything else is dropped
  // since :::code-group expects only code fences as children.
  const out: string[] = [];
  for (let i = 0; i < body.length; i++) {
    const line = body[i];
    const match = line.match(/^\.\.\s+(?:code-block|code|sourcecode)::\s*([A-Za-z0-9_+-]+)?\s*$/);
    if (!match) continue;
    const directiveLanguage = match[1] ?? '';
    const { options, nextLine } = readDirectiveOptions(body, i + 1);
    const { content, nextIndex } = readIndentedBlock(body, nextLine);
    const language = options.language || directiveLanguage;
    const fenceMeta = buildFenceMetaFromOptions(options);
    const infoString = [language, ...fenceMeta].filter(Boolean).join(' ');
    out.push(`\`\`\`${infoString}`.trimEnd());
    out.push(...content);
    out.push('```');
    out.push('');
    i = nextIndex - 1;
  }
  return out;
}

function readIndentedBlock(lines: string[], startIndex: number): { content: string[]; nextIndex: number } {
  let i = startIndex;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length || !/^\s+/.test(lines[i])) {
    return { content: [], nextIndex: startIndex };
  }

  const indent = lines[i].match(/^\s+/)?.[0].length ?? 0;
  const content: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      content.push('');
      i++;
      continue;
    }
    const currentIndent = line.match(/^\s+/)?.[0].length ?? 0;
    if (currentIndent < indent) break;
    content.push(line.slice(indent));
    i++;
  }

  while (content.length > 0 && content[0] === '') content.shift();
  while (content.length > 0 && content[content.length - 1] === '') content.pop();

  return { content, nextIndex: i };
}

export function rstToMarkdown(body: string): string {
  const lines = normalizeLines(body);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      out.push('');
      continue;
    }

    if (
      i + 1 < lines.length &&
      line.trim() &&
      isAdornmentLine(lines[i + 1]) &&
      !/^\s/.test(line)
    ) {
      const level = detectHeadingLevel(lines[i + 1]);
      if (level !== null) {
        out.push(`${'#'.repeat(level)} ${convertInlineRst(trimmed)}`);
        out.push('');
        i++;
        continue;
      }
    }

    if (/^\.\.\s+toctree::\s*$/.test(line)) {
      const { nextIndex } = readIndentedBlock(lines, i + 1);
      i = nextIndex - 1;
      continue;
    }

    const lineBlockRegex = /^\s*\|(?:\s(.*))?$/;
    if (lineBlockRegex.test(line)) {
      const blockLines: string[] = [];
      let j = i;
      while (j < lines.length) {
        const lineMatch = lines[j].match(lineBlockRegex);
        if (!lineMatch) break;
        blockLines.push((lineMatch[1] ?? '').trim());
        j++;
      }
      out.push('');
      blockLines.forEach((bl, idx) => {
        const content = convertInlineRst(bl);
        const isLast = idx === blockLines.length - 1;
        out.push(isLast ? `> ${content}` : `> ${content}  `);
      });
      out.push('');
      i = j - 1;
      continue;
    }

    const admonitionMatch = line.match(
      /^\.\.\s+(note|warning|tip|caution|attention|important|hint|danger|error|cnote)::(?:\s+(.*\S))?\s*$/i,
    );
    if (admonitionMatch) {
      const kind = admonitionMatch[1].toLowerCase();
      const inlineBody = admonitionMatch[2]?.trim() ?? '';
      const { content, nextIndex } = readIndentedBlock(lines, i + 1);

      let captionLabel: string | null = null;
      let bodyStart = 0;
      if (!inlineBody) {
        while (bodyStart < content.length && content[bodyStart].trim() === '') bodyStart++;
        while (bodyStart < content.length) {
          const ln = content[bodyStart];
          if (ln.trim() === '') {
            bodyStart++;
            break;
          }
          const optionMatch = ln.match(/^\s*:([A-Za-z-]+):\s*(.*)$/);
          if (!optionMatch) break;
          if (optionMatch[1].toLowerCase() === 'caption') {
            captionLabel = optionMatch[2].trim();
          }
          bodyStart++;
        }
      }
      const inlineHasParagraphBreak =
        inlineBody && i + 1 < lines.length && lines[i + 1].trim() === '';
      const bodyContent = inlineBody
        ? inlineHasParagraphBreak
          ? [inlineBody, '', ...content.slice(bodyStart)]
          : [inlineBody, ...content.slice(bodyStart)]
        : content.slice(bodyStart);

      const label = captionLabel || (kind.charAt(0).toUpperCase() + kind.slice(1));
      out.push(`> **${label}**`);
      out.push('>');
      for (const ln of bodyContent) {
        out.push(ln.trim() === '' ? '>' : `> ${convertInlineRst(ln)}`);
      }
      out.push('');
      i = nextIndex - 1;
      continue;
    }

    const imageMatch = line.match(/^\.\.\s+(?:image|figure)::\s+(.+?)\s*$/);
    if (imageMatch) {
      let alt = '';
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      while (j < lines.length && /^\s+:[A-Za-z-]+:/.test(lines[j])) {
        const optionMatch = lines[j].match(/^\s+:([A-Za-z-]+):\s*(.*)$/);
        if (optionMatch?.[1].toLowerCase() === 'alt') {
          alt = optionMatch[2].trim();
        }
        j++;
      }
      out.push(`![${alt}](${imageMatch[1].trim()})`);
      out.push('');
      i = j - 1;
      continue;
    }

    const codeGroupMatch = line.match(/^\.\.\s+code-group::\s*$/);
    if (codeGroupMatch) {
      // Collect the indented body — nested .. code-block:: blocks — and emit a
      // :::code-group MDX directive so the result lands in the same MDX pipeline.
      const { content: groupBody, nextIndex } = readIndentedBlock(lines, i + 1);
      out.push(':::code-group');
      out.push(...convertNestedCodeBlocksToFences(groupBody));
      out.push(':::');
      out.push('');
      i = nextIndex - 1;
      continue;
    }

    const codeMatch = line.match(/^\.\.\s+(?:code-block|code|sourcecode)::\s*([A-Za-z0-9_+-]+)?\s*$/);
    if (codeMatch) {
      const directiveLanguage = codeMatch[1] ?? '';
      const { options, nextLine } = readDirectiveOptions(lines, i + 1);
      const { content, nextIndex } = readIndentedBlock(lines, nextLine);

      const language = options.language || directiveLanguage;
      const fenceMeta = buildFenceMetaFromOptions(options);

      const infoString = [language, ...fenceMeta].filter(Boolean).join(' ');
      out.push(`\`\`\`${infoString}`.trimEnd());
      out.push(...content);
      out.push('```');
      out.push('');
      i = nextIndex - 1;
      continue;
    }

    if (trimmed.endsWith('::') && !trimmed.startsWith('..')) {
      const { content, nextIndex } = readIndentedBlock(lines, i + 1);
      if (content.length > 0) {
        const prefix = trimmed === '::' ? '' : convertInlineRst(trimmed.slice(0, -1));
        if (prefix) {
          out.push(prefix);
          out.push('');
        }
        out.push('```');
        out.push(...content);
        out.push('```');
        out.push('');
        i = nextIndex - 1;
        continue;
      }
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      out.push(convertInlineRst(line));
      continue;
    }

    out.push(convertInlineRst(line));
  }

  return out.join('\n').trim();
}

export function parseRstDocument(source: string): ParsedRstDocument {
  const lines = normalizeLines(source);
  const { title, titleIndex, nextIndex } = extractTitle(lines);
  const preTitleMetadata = extractPreambleMetadata(lines.slice(0, titleIndex));
  const { metadata: postTitleMetadata, nextIndex: contentIndex } = extractMetadata(lines, nextIndex);
  const metadata = mergeMetadata(preTitleMetadata, postTitleMetadata);
  const body = lines.slice(contentIndex).join('\n').trim();
  const markdownBody = rstToMarkdown(body);

  return {
    title,
    body,
    markdownBody,
    metadata,
    headings: getHeadings(markdownBody),
    excerpt: metadata.excerpt ?? '',
    readingMinutes: calculateReadingMinutes(markdownBody),
    wordCount: calculateWordCount(markdownBody),
  };
}
