import { getAllTags, getPostsByTag, getFlowsByTag } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';
import TagPageHeader from '@/components/TagPageHeader';
import TagSidebar from '@/components/TagSidebar';
import TagContentTabs from '@/components/TagContentTabs';

export async function generateStaticParams() {
  const tags = getAllTags();
  const tagKeys = Object.keys(tags);
  if (tagKeys.length === 0) return [{ tag: '_' }];
  // Keys are display-cased; normalize to lowercase for URL slugs and deduplicate.
  const seen = new Set<string>();
  return tagKeys
    .map(t => t.toLowerCase())
    .filter(t => !seen.has(t) && seen.add(t))
    .map(tag => ({ tag }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const posts = getPostsByTag(decodedTag);
  const flows = getFlowsByTag(decodedTag);
  const total = posts.length + flows.length;

  return {
    title: `#${decodedTag} | ${resolveLocale(siteConfig.title)}`,
    description: `${total} posts tagged with "${decodedTag}".`,
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const posts = getPostsByTag(decodedTag);
  const flows = getFlowsByTag(decodedTag);
  const allTags = getAllTags();

  if (posts.length === 0 && flows.length === 0) {
    notFound();
  }

  return (
    <div className="layout-container">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
        <TagSidebar key={decodedTag} tags={allTags} activeTag={decodedTag} />

        <div className="flex-1 min-w-0">
          <TagPageHeader tag={decodedTag} postCount={posts.length} flowCount={flows.length} />
          <TagContentTabs posts={posts} flows={flows} />
        </div>
      </div>
    </div>
  );
}
