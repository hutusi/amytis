import Link from 'next/link';
import { cn } from '@/lib/cn';

interface TagProps {
  tag: string;
  count?: number;
  variant?: 'default' | 'compact' | 'large' | 'pill';
  showHash?: boolean;
  className?: string;
}

/**
 * Unified tag component for consistent styling across the site.
 * Variants:
 * - default: Standard pill-style tag (for post headers)
 * - compact: Minimal inline style (for post lists)
 * - large: Card-style with optional count (for tag cloud)
 * - pill: Subtle chip used inside list/catalog cards; renders without the
 *   leading hash and is meant to sit above a card-cover link (pass
 *   `className="relative z-10"`).
 *
 * The href always encodes the (lowercased) tag so special-character tags
 * (e.g. `c#`, `a/b`) resolve correctly against the /tags/[tag] route.
 */
export default function Tag({ tag, count, variant = 'default', showHash = true, className }: TagProps) {
  const baseClasses =
    'no-underline transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50';

  const variantClasses = {
    default:
      'inline-flex px-3 py-1 bg-ink/[0.05] rounded-full text-xs font-medium text-muted hover:bg-accent/10 hover:text-accent',
    compact: 'text-xs text-muted hover:text-accent',
    large:
      'group relative inline-flex items-center px-4 py-2 rounded-2xl border border-ink/[0.07] bg-ink/[0.02] hover:bg-background hover:border-accent hover:shadow-md hover:shadow-accent/5',
    pill: 'text-xs px-2 py-0.5 rounded-full bg-ink/[0.05] text-muted/70 hover:bg-accent/10 hover:text-accent',
  };

  // Pill chips read better without the leading hash (matches their prior
  // in-card usage); the other variants keep the hash by default.
  const withHash = variant === 'pill' ? false : showHash;

  return (
    <Link
      href={`/tags/${encodeURIComponent(tag.toLowerCase())}`}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      {variant === 'large' ? (
        <>
          <span className="font-sans font-medium text-foreground group-hover:text-accent transition-colors text-sm">
            {tag}
          </span>
          {count !== undefined && (
            <span className="ml-2 text-xs font-mono text-muted/60 group-hover:text-accent/60">
              {count}
            </span>
          )}
        </>
      ) : (
        <span>{withHash ? '#' : ''}{tag}</span>
      )}
    </Link>
  );
}
