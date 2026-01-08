import Link from 'next/link';
import { PostData } from '@/lib/markdown';

interface PostListProps {
  posts: PostData[];
}

export default function PostList({ posts }: PostListProps) {
  return (
    <ul className="space-y-12">
      {posts.map((post) => (
        <li key={post.slug} className="group">
          <Link href={`/posts/${post.slug}`} className="block">
            <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-2">
              <h2 className="text-2xl font-serif font-medium text-heading group-hover:text-accent transition-colors duration-200">
                {post.title}
              </h2>
              <time className="text-sm font-mono text-muted shrink-0 md:ml-6 mt-1 md:mt-0">
                {post.date}
              </time>
            </div>
            <p className="text-foreground/80 leading-relaxed line-clamp-2">
              {post.excerpt}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
