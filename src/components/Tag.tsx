import Link from 'next/link';

interface TagProps {
  tag: string;
  count?: number;
  variant?: 'default' | 'compact' | 'large';
  showHash?: boolean;
}

/**
 * Unified tag component for consistent styling across the site.
 * Variants:
 * - default: Standard pill-style tag (for post headers)
 * - compact: Minimal inline style (for post lists)
 * - large: Card-style with optional count (for tag cloud)
 */
export default function Tag({ tag, count, variant = 'default', showHash = true }: TagProps) {
  const baseClasses = 'no-underline transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50';

  const variantClasses = {
    default: 'inline-flex px-3 py-1 bg-muted/10 rounded-full text-xs font-medium text-muted hover:bg-accent/10 hover:text-accent',
    compact: 'text-xs text-muted hover:text-accent',
    large: 'group relative inline-flex items-center px-4 py-2 rounded-xl border border-muted/20 bg-muted/5 hover:bg-background hover:border-accent hover:shadow-md hover:shadow-accent/5',
  };

  return (
    <Link
      href={`/tags/${tag.toLowerCase()}`}
      className={`${baseClasses} ${variantClasses[variant]}`}
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
        <span>{showHash ? '#' : ''}{tag}</span>
      )}
    </Link>
  );
}
