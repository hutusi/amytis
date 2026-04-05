import { generateRssFeed } from '@/lib/feed-utils';

export const dynamic = 'force-static';

export async function GET() {
  return generateRssFeed('posts', '/posts/feed.xml');
}
