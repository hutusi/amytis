import { LuArrowUpRight } from 'react-icons/lu';

/**
 * Inline outward-arrow indicator appended after external-link text by
 * `MarkdownRenderer`'s `<a>` override. Sized relative to the surrounding
 * text and aria-hidden — the link's accessible name already carries intent.
 */
export default function ExternalLinkIcon() {
  return (
    <LuArrowUpRight
      aria-hidden="true"
      className="inline-block align-text-top ml-0.5 text-[0.85em] opacity-70"
    />
  );
}
