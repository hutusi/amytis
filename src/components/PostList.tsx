import Link from 'next/link';
import { PostData } from '@/lib/markdown';

interface PostListProps {
  posts: PostData[];
}

export default function PostList({ posts }: PostListProps) {
  return (
    <ul className="space-y-16">
      {posts.map((post) => (
        <li key={post.slug} className="group">
          <Link href={`/posts/${post.slug}`} className="block">
            <div className="flex items-center gap-3 text-xs font-sans text-muted mb-3">
              <span className="uppercase tracking-widest font-semibold text-accent/80">
                {post.category}
              </span>
              <span className="w-1 h-1 rounded-full bg-muted/30" />
              <time className="font-mono">{post.date}</time>
            </div>
            
            <h2 className="text-3xl font-serif font-bold text-heading group-hover:text-accent transition-colors duration-200 mb-3">
              {post.title}
            </h2>
            
            <p className="text-foreground/70 leading-relaxed line-clamp-2 mb-4 font-serif">
              {post.excerpt}
            </p>

            <div className="flex items-center gap-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs text-muted/60 font-sans italic">
                  #{tag}
                </span>
              ))}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
