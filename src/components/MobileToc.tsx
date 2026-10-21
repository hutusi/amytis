import type { Heading } from '@/lib/content/types';
import { T } from '@/components/T';
import { metaLabel } from '@/lib/ui-classes';

/**
 * "On this page" for viewports below `lg`, where the sidebar TOC is hidden.
 * A native <details> with plain hash links: it needs no JavaScript, is in
 * the static HTML, and the jumps land below the navbar through the global
 * `[id] { scroll-margin-top }`. Kept out of the search index (it repeats
 * the headings).
 */
export default function MobileToc({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;
  return (
    <details data-pagefind-ignore className="group ink-card mb-10 lg:hidden print:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span id="mobile-toc-label" className={metaLabel()}>
          <T k="on_this_page" />
        </span>
        <svg
          className="h-3.5 w-3.5 text-muted transition-transform duration-200 group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <nav aria-labelledby="mobile-toc-label" className="border-t border-line px-5 py-3">
        <ul className="space-y-0.5">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className="block py-1.5 text-sm leading-snug text-foreground/80 no-underline transition-colors hover:text-accent"
                style={{ paddingLeft: `${(heading.level - 2) * 0.75}rem` }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
