import GithubSlugger from 'github-slugger';

// Shared slug helpers for the content-creation scripts.
//
// The variants are NOT interchangeable: slugs become permanent URLs (posts,
// notes, book chapters, series), so each script must keep its exact historical
// output. Pick the variant matching the script's original inline rules — do
// not "upgrade" a call site from one variant to another.
//
// Trim note: the original scripts trimmed edge dashes with two different
// regexes — /(^-|-$)+/g (new-post, import-book) and /^-|-$/g (new-note,
// import-obsidian). After the collapse step the string can never contain
// consecutive dashes, so at most one leading and one trailing dash exist and
// the two regexes are behaviorally identical. A single trim is used here;
// tests/tooling/slug.test.ts proves parity against the original regex pairs.

/**
 * ASCII-only slug (new-post): lowercases, collapses every run of characters
 * outside [a-z0-9] into a single dash, trims edge dashes. Non-ASCII (incl.
 * CJK) is stripped. May return '' when nothing survives.
 */
export function slugifyAscii(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * CJK-preserving slug (new-note, import-book): like slugifyAscii but also
 * keeps CJK Unified Ideographs (U+4E00–U+9FFF). May return '' when nothing
 * survives.
 */
export function slugifyCjk(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * CJK-preserving slug with fallback (import-obsidian): identical to
 * slugifyCjk, but returns 'untitled' instead of '' so imported files always
 * get a usable filename / wikilink target.
 */
export function slugifyCjkOrUntitled(text: string): string {
  return slugifyCjk(text) || 'untitled';
}

/**
 * GitHub-style slug (new-series): github-slugger rules — Unicode-aware
 * lowercasing, keeps non-ASCII letters, does NOT collapse dash runs. A fresh
 * slugger instance is created per call, so repeated identical inputs return
 * the same slug (no "-1" dedup suffix) — matching new-series, which slugs a
 * single title per invocation.
 */
export function slugifyGithub(text: string): string {
  return new GithubSlugger().slug(text);
}
