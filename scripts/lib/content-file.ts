import fs from 'fs';

// Shared file-creation helpers for the content-creation scripts (new-post,
// new-note, new-flow, and the importers). Only genuinely common mechanics
// live here — frontmatter shapes, arg parsing, and route layout stay in each
// script because they differ meaningfully per content type.

/**
 * Date stamp as YYYY-MM-DD derived from toISOString(), i.e. in UTC.
 * (new-flow intentionally does NOT use this — it builds its target path from
 * local-time date parts.)
 */
export function isoDateStamp(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * The `.md`/`.mdx` extension pair: `ext` for the file being created, `altExt`
 * for the sibling extension checked in duplicate detection.
 */
export function extPair(useMd: boolean): { ext: '.md' | '.mdx'; altExt: '.md' | '.mdx' } {
  return useMd ? { ext: '.md', altExt: '.mdx' } : { ext: '.mdx', altExt: '.md' };
}

/**
 * Escape a string for interpolation inside a double-quoted YAML scalar
 * (`title: "<here>"`). Backslashes first, then quotes — otherwise a title
 * containing either writes frontmatter that fails to parse at build time.
 */
export function yamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** mkdir -p, skipped when the directory already exists. */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Standard duplicate guard: if filePath exists, print
 * `Error: <Kind> already exists at <path>` and exit(1).
 * `kind` is the lowercase content kind ('post' | 'note' | 'flow').
 */
export function exitIfExists(filePath: string, kind: string): void {
  if (fs.existsSync(filePath)) {
    console.error(`Error: ${kind.charAt(0).toUpperCase()}${kind.slice(1)} already exists at ${filePath}`);
    process.exit(1);
  }
}

/**
 * Write the new content file and print the standard
 * `Created new <kind>: <path>` feedback.
 */
export function writeContentFile(filePath: string, content: string, kind: string): void {
  fs.writeFileSync(filePath, content);
  console.log(`Created new ${kind}: ${filePath}`);
}
