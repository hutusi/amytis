import { getAllTags } from '@/lib/content/discovery';
import { getPostsByTag } from '@/lib/content/posts';
import { getFlowsByTag } from '@/lib/content/flows';
import { getNotesByTag } from '@/lib/content/notes';
import { isFeatureEnabled } from '@/lib/features';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { resolveLocale, tWith } from '@/lib/i18n';
import { safeDecodeParam, resolveFromParam, withDevEncodedVariants } from '@/lib/route-params';
import TagPageHeader from '@/components/TagPageHeader';
import TagSidebar from '@/components/TagSidebar';
import TagContentTabs from '@/components/TagContentTabs';

export async function generateStaticParams() {
  const tags = getAllTags();
  const tagKeys = Object.keys(tags);
  if (tagKeys.length === 0) return [{ tag: '_' }];
  // Keys are display-cased; normalize to lowercase for URL slugs and deduplicate.
  const seen = new Set<string>();
  return withDevEncodedVariants(
    tagKeys
      .map(t => t.toLowerCase())
      .filter(t => !seen.has(t) && seen.add(t))
      .map(tag => ({ tag }))
  );
}

export const dynamicParams = false;

function resolveTagParam(rawTag: string) {
  // Notes and flows are part of the `flow` feature; skip them when it's
  // disabled so a note/flow-only tag doesn't render links to 404'd routes.
  const flowEnabled = isFeatureEnabled('flow');
  return resolveFromParam(rawTag, (candidate) => {
    const posts = getPostsByTag(candidate);
    const flows = flowEnabled ? getFlowsByTag(candidate) : [];
    const notes = flowEnabled ? getNotesByTag(candidate) : [];
    return posts.length + flows.length + notes.length > 0
      ? { tag: candidate, posts, flows, notes }
      : null;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const resolved = resolveTagParam(tag);
  const displayTag = resolved?.tag ?? safeDecodeParam(tag);
  const total = resolved ? resolved.posts.length + resolved.flows.length + resolved.notes.length : 0;

  return {
    title: `#${displayTag} | ${resolveLocale(siteConfig.title)}`,
    // Content-neutral: total spans posts, flows, and notes — not just posts.
    description: tWith('tag_meta_description', { count: total, tag: displayTag }),
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const resolved = resolveTagParam(tag);
  const allTags = getAllTags();

  if (!resolved) {
    notFound();
  }
  const { tag: decodedTag, posts, flows, notes } = resolved;

  return (
    <div className="layout-container">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        <TagSidebar key={decodedTag} tags={allTags} activeTag={decodedTag} />

        <div className="flex-1 min-w-0">
          <TagPageHeader tag={decodedTag} postCount={posts.length} flowCount={flows.length} noteCount={notes.length} />
          <TagContentTabs posts={posts} flows={flows} notes={notes} />
        </div>
      </div>
    </div>
  );
}
