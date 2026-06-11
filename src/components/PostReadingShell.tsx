'use client';

import type { ReactNode } from 'react';
import { useImmersiveReading } from '@/components/ImmersiveReadingProvider';
import ImmersiveReader from '@/components/ImmersiveReader';
import ImmersiveSeriesSidebar from '@/components/ImmersiveSeriesSidebar';
import { getSeriesUrl } from '@/lib/urls';
import type { CollectionContext, Heading, PostData } from '@/lib/content/types';

interface PostReadingShellProps {
  post: { slug: string; title: string; series?: string; headings?: Heading[] };
  seriesSlug?: string;
  seriesTitle?: string;
  seriesPosts?: PostData[];
  collectionContexts?: CollectionContext[];
  /** Slim article subtree to render inside the overlay (header + body + nav).
   *  Pre-built in PostLayout so the heavy MarkdownRenderer/RstRenderer is the
   *  same ReactElement reference as in `children` — only one of the two ever
   *  mounts, so the body renders exactly once. */
  overlayArticle: ReactNode;
  /** Full normal-mode layout subtree (sidebar + article + comments + nav +
   *  related etc.). Rendered when immersive is off OR the post isn't in a
   *  series. */
  children: ReactNode;
}

/**
 * Post-side analog of BookReadingShell. Branches on the immersive `enabled`
 * flag AND whether the post belongs to a series — without a series there's no
 * meaningful TOC for the overlay sidebar, so the toggle is a no-op and we
 * just render the normal layout.
 */
export default function PostReadingShell({
  post,
  seriesSlug,
  seriesTitle,
  seriesPosts,
  collectionContexts,
  overlayArticle,
  children,
}: PostReadingShellProps) {
  const { enabled } = useImmersiveReading();
  const inSeries = !!(seriesSlug && seriesPosts && seriesPosts.length > 0);

  if (!enabled || !inSeries) {
    return <>{children}</>;
  }

  return (
    <ImmersiveReader
      rootHref={getSeriesUrl(seriesSlug)}
      rootTitle={seriesTitle ?? seriesSlug}
      currentTitle={post.title}
      sidebar={
        <ImmersiveSeriesSidebar
          seriesSlug={seriesSlug}
          seriesTitle={seriesTitle ?? seriesSlug}
          posts={seriesPosts}
          collectionContexts={collectionContexts}
          currentSlug={post.slug}
          headings={post.headings}
        />
      }
    >
      {overlayArticle}
    </ImmersiveReader>
  );
}
