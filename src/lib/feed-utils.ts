import { getAllPosts, getAllFlows } from './markdown';
import { siteConfig } from '../../site.config';
import { getPostUrl } from './urls';

export interface FeedItem {
  title: string;
  url: string;
  date: Date;
  excerpt: string;
  content: string;
  tags: string[];
  authors?: string[];
}

export function getFeedItems(): FeedItem[] {
  const { maxItems, includeFlows } = siteConfig.feed;
  const baseUrl = siteConfig.baseUrl.replace(/\/+$/, '');

  const postItems: FeedItem[] = getAllPosts().map((post) => ({
    title: post.title,
    url: `${baseUrl}${getPostUrl(post)}`,
    date: new Date(post.date),
    excerpt: post.excerpt,
    content: post.content,
    tags: post.tags || [],
    authors: post.authors,
  }));

  let items: FeedItem[] = postItems;

  if (includeFlows) {
    const flowItems: FeedItem[] = getAllFlows().map((flow) => ({
      title: flow.title,
      url: `${baseUrl}/flows/${flow.slug}`,
      date: new Date(flow.date),
      excerpt: flow.excerpt,
      content: flow.content,
      tags: flow.tags || [],
    }));
    items = [...postItems, ...flowItems].sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  return maxItems > 0 ? items.slice(0, maxItems) : items;
}
