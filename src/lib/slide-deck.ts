/**
 * Shared helpers for `:::slides` decks. The remark plugin (build time), the
 * feed pipeline and the client runtime all use these, so this module stays
 * free of Node and React imports.
 *
 * Every slide carries an id `${stem}-${n}` (n from 1). The stem is the deck's
 * `{#id}` or an automatic `slides`, `slides2`, … — never `slides-2`, which
 * would be the first deck's second slide — behind an optional page prefix
 * (the flow stream's heading-id prefix). `#slides-12` therefore opens the
 * first deck at slide 12.
 */

const DECK_ID_RE = /^[A-Za-z][\w-]*$/;
const SLIDE_NUMBER_RE = /^[1-9]\d*$/;

/** Whether an author-supplied `{#id}` can be a deck id stem. */
export function isValidDeckId(id: string): boolean {
  return DECK_ID_RE.test(id);
}

/** The automatic id of the nth (0-based) deck without an explicit id. */
export function autoDeckBase(index: number): string {
  return index === 0 ? 'slides' : `slides${index + 1}`;
}

/** The id of slide `n` (1-based) in the deck whose full stem is `stem`. */
export function slideId(stem: string, n: number): string {
  return `${stem}-${n}`;
}

/**
 * The 0-based slide a URL hash names in the deck with this stem and slide
 * count, or null when the hash belongs to something else (a heading, another
 * deck) or is out of range.
 */
export function parseSlideHash(hash: string, stem: string, count: number): number | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // A malformed escape can't name one of our ASCII ids anyway.
  }
  const prefix = `${stem}-`;
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  if (!SLIDE_NUMBER_RE.test(rest)) return null;
  const n = Number(rest);
  return n <= count ? n - 1 : null;
}

/**
 * The 0-based slide a track scrolled to `scrollLeft` shows, for slides that
 * are each one track `width` wide. A track that isn't laid out (width 0,
 * e.g. inside a closed <details>) reports the first slide.
 */
export function slideIndexFromScroll(scrollLeft: number, width: number, count: number): number {
  if (!(width > 0) || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / width)));
}
