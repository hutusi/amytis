import { generateAtomFeed } from '@/lib/feed-utils';

export const dynamic = 'force-static';

export async function GET() {
  return generateAtomFeed('flows', '/flows/feed.atom');
}
