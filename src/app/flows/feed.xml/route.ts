import { generateRssFeed } from '@/lib/feed-utils';

export const dynamic = 'force-static';

export async function GET() {
  return generateRssFeed('flows', '/flows/feed.xml');
}
