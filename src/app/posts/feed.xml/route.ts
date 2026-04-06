import { generateRssFeed } from '@/lib/feed-utils';
import { getPostsBasePath } from '@/lib/urls';

export const dynamic = 'force-static';

export async function GET() {
  const basePath = getPostsBasePath();
  return generateRssFeed('posts', `/${basePath}/feed.xml`);
}
