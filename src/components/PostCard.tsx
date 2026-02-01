import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import CoverImage from './CoverImage';

export default function PostCard({ post }: { post: PostData }) {
  return (
    <Link href={`/posts/${post.slug}`} className="group block h-full no-underline">
      <div className="flex flex-col h-full overflow-hidden rounded-xl border border-muted/20 bg-background transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5">
        <div className="relative h-32 w-full overflow-hidden bg-muted/10">
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
            <span className="h-1 w-1 rounded-full bg-muted/30" />
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