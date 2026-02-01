import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import Tag from '@/components/Tag';

interface PostListProps {
  posts: PostData[];
}

export default function PostList({ posts }: PostListProps) {
  return (
    <ul className="space-y-16">
      {posts.map((post) => (
        <li key={post.slug} className="group">
          <div className="flex items-center gap-3 text-xs font-sans text-muted mb-3">
            {post.draft && (
              <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded tracking-wider">
                DRAFT
              </span>
            )}
            <span className="uppercase tracking-widest font-semibold text-accent/80">
              {post.category}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted/30" />
            <div className="flex items-center gap-1">
              {post.authors.map((author, index) => (
                <span key={author} className="flex items-center">
                  <Link 
                    href={`/authors/${encodeURIComponent(author)}`}
                    className="italic hover:text-heading transition-colors duration-200"
                  >
                    {author}
                  </Link>
                  {index < post.authors.length - 1 && <span className="mr-1">,</span>}
                </span>
              ))}
            </div>
            <span className="w-1 h-1 rounded-full bg-muted/30" />
            <time className="font-mono">{post.date}</time>
          </div>
          
          <Link href={`/posts/${post.slug}`} className="block">
            <h2 className="text-3xl font-serif font-bold text-heading group-hover:text-accent transition-colors duration-200 mb-3">
              {post.title}
            </h2>
          </Link>
          
          <p className="text-foreground/90 leading-relaxed line-clamp-2 mb-4 font-serif">
            {post.excerpt}
          </p>

          <div className="flex items-center gap-2">
            {post.tags.slice(0, 3).map(tag => (
              <Tag key={tag} tag={tag} variant="compact" />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}