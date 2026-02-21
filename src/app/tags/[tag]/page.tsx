import { getAllTags, getPostsByTag, getFlowsByTag } from '@/lib/markdown';
import PostCard from '@/components/PostCard';
import FlowTimelineEntry from '@/components/FlowTimelineEntry';
import { notFound } from 'next/navigation';
import { siteConfig } from '../../../../site.config';
import { Metadata } from 'next';
import { resolveLocale } from '@/lib/i18n';
import TagPageHeader from '@/components/TagPageHeader';
import TagSidebar from '@/components/TagSidebar';

export async function generateStaticParams() {
  const tags = getAllTags();
  return Object.keys(tags).map((tag) => ({
    tag,
  }));
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
        <TagSidebar tags={allTags} activeTag={decodedTag} />

        <div className="flex-1 min-w-0">
          <TagPageHeader tag={decodedTag} postCount={posts.length + flows.length} />

          {posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map(post => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}

          {flows.length > 0 && (
            <div className={posts.length > 0 ? 'mt-12' : ''}>
              <div className="space-y-0">
                {flows.map(flow => (
                  <FlowTimelineEntry
                    key={flow.slug}
                    date={flow.date}
                    title={flow.title}
                    excerpt={flow.excerpt}
                    tags={flow.tags}
                    slug={flow.slug}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
