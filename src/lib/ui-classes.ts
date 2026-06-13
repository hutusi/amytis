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
  'group-hover:border-accent/30 group-hover:bg-ink/[0.04] group-hover:shadow-md group-hover:shadow-accent/5';

/**
 * Cover-image zoom-on-hover. Default transition is `duration-500`; the slower
 * hero variant composes `cn(COVER_ZOOM, 'duration-700')` (tailwind-merge keeps
 * the later duration).
 */
export const COVER_ZOOM =
  'h-full w-full object-cover transition-transform duration-500 group-hover:scale-105';
