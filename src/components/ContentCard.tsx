import type { ReactNode } from 'react';
import Link from 'next/link';
import CoverImage from './CoverImage';
import { cn } from '@/lib/cn';
import { COVER_ZOOM } from '@/lib/ui-classes';
import { t } from '@/lib/i18n';

interface ContentCardProps {
  href: string;
  title: string;
  /** Used by CoverImage to resolve co-located cover assets. */
  slug: string;
  coverImage?: string;
  /** Accent badge content, e.g. "5 chapters" or "3 parts". */
  badge: ReactNode;
  /** Optional "written by …" line; omitted when empty (e.g. on author pages). */
  authors?: string[];
  excerpt?: string;
  /**
   * `index` — the two-up listing card (h-48 cover, p-8, h2 title).
   * `compact` — the denser author-page card (h-40 cover, p-6, h3 title).
   */
  size?: 'index' | 'compact';
}

/**
 * Cover card shared by the book and series listings. Replaces four
 * near-identical inlined card blocks across the /books, /series, and
 * /authors/[author] routes. Presentational only — callers resolve the URL
 * (via getBookUrl / getSeriesUrl) and badge label.
 */
export default function ContentCard({
  href,
  title,
  slug,
  coverImage,
  badge,
  authors,
  excerpt,
  size = 'index',
}: ContentCardProps) {
  const compact = size === 'compact';
  const Heading = compact ? 'h3' : 'h2';

  return (
    <Link href={href} className="group block no-underline">
      {/* ink-card surface + card-base's chrome minus its built-in p-8, so the
          inner padding below doesn't have to fight a p-0 override. */}
      <div className="ink-card group relative flex h-full flex-col overflow-hidden transition-all hover:border-accent/30">
        <div className={cn('relative w-full overflow-hidden bg-ink/[0.04]', compact ? 'h-40' : 'h-48')}>
          <CoverImage src={coverImage} title={title} slug={slug} className={COVER_ZOOM} />
        </div>
        <div className={compact ? 'p-6' : 'p-8'}>
          <span className={cn('badge-accent', compact && 'mb-3')}>{badge}</span>
          <Heading
            className={cn(
              'font-serif font-bold text-heading transition-colors group-hover:text-accent',
              compact ? 'mb-2 text-xl' : 'mb-3 text-2xl',
            )}
          >
            {title}
          </Heading>
          {authors && authors.length > 0 && (
            <p className="text-xs text-muted mb-3">
              {t('written_by')} {authors.slice(0, 3).join(', ')}
            </p>
          )}
          {excerpt && (
            <p
              className={cn(
                'text-muted font-serif italic leading-relaxed',
                compact ? 'text-sm line-clamp-2' : 'line-clamp-3',
              )}
            >
              {excerpt}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
