import Link from 'next/link';
import type { PostData } from '@/lib/content/types';
import CoverImage from './CoverImage';
import { getPostUrl } from '@/lib/urls';

export default function PostCard({ post }: { post: PostData }) {
  return (
    <Link href={getPostUrl(post)} className="group block h-full no-underline">
      <div className="ink-card flex flex-col h-full overflow-hidden transition-all duration-300 hover:border-accent/40 hover:shadow-md hover:shadow-accent/5">
        <div className="relative h-32 w-full overflow-hidden bg-ink/[0.04]">
          <CoverImage 
            src={post.coverImage} 
            title={post.title} 
            slug={post.slug} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-sans text-muted">
            <span className="font-mono text-accent">{post.date}</span>
            <span className="h-1 w-1 rounded-full bg-ink/[0.12]" />
            <span className="uppercase tracking-widest">{post.category}</span>
          </div>
          <h3 className="mb-1 font-serif text-lg font-bold text-heading/80 transition-colors group-hover:text-accent">
            {post.title}
          </h3>
        </div>
      </div>
    </Link>
  );
}