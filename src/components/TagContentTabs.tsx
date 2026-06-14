'use client';

import { useState } from 'react';
import { useLanguage } from './LanguageProvider';
import PostList from './PostList';
import FlowTimelineEntry from './FlowTimelineEntry';
import MetaLabel from './ui/MetaLabel';
import type { PostData } from '@/lib/content/types';

type Tab = 'all' | 'posts' | 'flows';

interface FlowEntry {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
}

interface TagContentTabsProps {
  posts: PostData[];
  flows: FlowEntry[];
}

export default function TagContentTabs({ posts, flows }: TagContentTabsProps) {
  const { t } = useLanguage();
  const hasBoth = posts.length > 0 && flows.length > 0;
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const showSectionHeaders = hasBoth && activeTab === 'all';

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showFlows = activeTab === 'all' || activeTab === 'flows';

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: t('tab_all'), count: posts.length + flows.length },
    { key: 'posts', label: t('posts'), count: posts.length },
    { key: 'flows', label: t('flow_notes'), count: flows.length },
  ];

  return (
    <div>
      {/* Type tabs — only shown when both content types exist */}
      {hasBoth && (
        <div role="tablist" className="flex mb-8 border-b border-ink/[0.07]">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? 'text-accent border-accent'
                  : 'text-muted border-transparent hover:text-foreground'
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs font-mono ${activeTab === key ? 'text-accent/60' : 'text-muted/50'}`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Posts section */}
      {showPosts && posts.length > 0 && (
        <div>
          {showSectionHeaders && (
            <MetaLabel as="h2" className="mb-6">
              {t('posts')}
              <span className="ml-1.5 font-mono font-normal normal-case tracking-normal text-muted/50">
                {posts.length}
              </span>
            </MetaLabel>
          )}
          <PostList posts={posts} />
        </div>
      )}

      {/* Flows section */}
      {showFlows && flows.length > 0 && (
        <div className={showPosts && posts.length > 0 ? 'mt-12' : ''}>
          {showSectionHeaders && (
            <MetaLabel as="h2" className="mb-4">
              {t('flow_notes')}
              <span className="ml-1.5 font-mono font-normal normal-case tracking-normal text-muted/50">
                {flows.length}
              </span>
            </MetaLabel>
          )}
          <div>
            {flows.map(flow => (
              <FlowTimelineEntry
                key={flow.slug}
                date={flow.date}
                excerpt={flow.excerpt}
                tags={flow.tags}
                slug={flow.slug}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
