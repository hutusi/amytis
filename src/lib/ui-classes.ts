/**
 * Shared Tailwind class strings for repeated component styling, composed via
 * `cn()` at call sites. Component-shaped patterns (labels, dots, headings)
 * live as primitives in `src/components/ui/`; these are the fragments that
 * attach to existing elements (card wrappers, cover images) where wrapping in
 * a component would be awkward. Mirrors the `PROSE_CLASSES` pattern in
 * `prose-classes.ts`.
 */

/**
 * Hover chrome for an interactive card whose hover is driven by a `.group`
 * ancestor (the `<Link className="group">` wrapper). Compose onto `.ink-card`.
 */
export const CARD_HOVER =
  'group-hover:border-accent/30 group-hover:bg-surface-soft group-hover:shadow-md group-hover:shadow-accent/5';

/**
 * Cover-image zoom-on-hover, with a `duration-500` transition. The homepage's
 * larger featured covers use COVER_ZOOM_SLOW. A separate constant, not
 * `cn(COVER_ZOOM, 'duration-700')`: cn() doesn't resolve conflicts, and two
 * durations would be decided by stylesheet order.
 */
export const COVER_ZOOM =
  'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105';

export const COVER_ZOOM_SLOW =
  'h-full w-full object-cover transition-transform duration-700 group-hover:scale-105';

/**
 * The uppercase micro-label base styling. The `MetaLabel` primitive in
 * `src/components/ui/` is the preferred way to render these; this raw-string
 * helper exists for the few cases that need the classes on a non-label element
 * (e.g. a `<Link>` that is itself styled as a label). Keep this the single
 * source of truth for the string.
 */
/**
 * One slide of a `:::slides` deck: a full-width snap point in the deck's
 * horizontal track (remark-slide-deck stamps it on each slide wrapper).
 * `snap-always` stops a fast swipe from skipping slides; in print the track
 * stacks the slides, one unbroken block each.
 */
export const SLIDE_DECK_SLIDE =
  'flex w-full shrink-0 snap-start snap-always items-center justify-center break-inside-avoid print:mb-4';

export const META_LABEL_BASE = 'text-[10px] font-sans font-bold uppercase tracking-widest';

export function metaLabel(tone: 'muted' | 'accent' = 'muted'): string {
  return `${META_LABEL_BASE} ${tone === 'accent' ? 'text-accent' : 'text-muted'}`;
}
