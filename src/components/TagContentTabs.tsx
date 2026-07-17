'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import PostList from './PostList';
import FlowTimelineEntry from './FlowTimelineEntry';
import Tag from './Tag';
import MetaLabel from './ui/MetaLabel';
import type { PostData } from '@/lib/content/types';

type Tab = 'all' | 'posts' | 'flows' | 'notes';

interface FlowEntry {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
}

interface NoteEntry {
  slug: string;
  date: string;
  title: string;
  excerpt: string;
  tags: string[];
}

interface TagContentTabsProps {
  posts: PostData[];
  flows: FlowEntry[];
  notes: NoteEntry[];
}

export default function TagContentTabs({ posts, flows, notes }: TagContentTabsProps) {
  const { t } = useLanguage();
  // Tabs appear only when more than one content type is present; with a single
  // type the sections render bare, exactly as before notes were added.
  const presentTypes = [posts.length, flows.length, notes.length].filter(n => n > 0).length;
  const showTabs = presentTypes > 1;
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const showSectionHeaders = showTabs && activeTab === 'all';

  const showPosts = activeTab === 'all' || activeTab === 'posts';
  const showFlows = activeTab === 'all' || activeTab === 'flows';
  const showNotes = activeTab === 'all' || activeTab === 'notes';

  // Only surface a per-type tab when that type has items.
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: t('tab_all'), count: posts.length + flows.length + notes.length },
    ...(posts.length > 0 ? [{ key: 'posts' as const, label: t('posts'), count: posts.length }] : []),
    ...(flows.length > 0 ? [{ key: 'flows' as const, label: t('flow_notes'), count: flows.length }] : []),
    ...(notes.length > 0 ? [{ key: 'notes' as const, label: t('notes'), count: notes.length }] : []),
  ];

  return (
    <div>
      {/* Type tabs — only shown when more than one content type exists */}
      {showTabs && (
        <div role="tablist" className="flex mb-8 border-b border-line">
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

      {/* Notes section */}
      {showNotes && notes.length > 0 && (
        <div className={(showPosts && posts.length > 0) || (showFlows && flows.length > 0) ? 'mt-12' : ''}>
          {showSectionHeaders && (
            <MetaLabel as="h2" className="mb-4">
              {t('notes')}
              <span className="ml-1.5 font-mono font-normal normal-case tracking-normal text-muted/50">
                {notes.length}
              </span>
            </MetaLabel>
          )}
          <div className="space-y-0">
            {notes.map(note => (
              <article key={note.slug} className="relative pl-6 pb-8 border-l-2 border-line-strong last:pb-0">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
                <time className="text-xs font-mono text-accent">{note.date}</time>
                <h3 className="mt-1 mb-2 font-serif text-xl font-bold text-heading">
                  <Link href={`/notes/${note.slug}`} className="no-underline hover:text-accent transition-colors">
                    {note.title}
                  </Link>
                </h3>
                <p className="text-sm text-muted leading-relaxed line-clamp-3">{note.excerpt}</p>
                {note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {note.tags.map(tag => (
                      <Tag key={tag} tag={tag} variant="compact" />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
