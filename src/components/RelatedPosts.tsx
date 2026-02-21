import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import { t } from '@/lib/i18n';

export default function RelatedPosts({ posts }: { posts: PostData[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="mt-12 pt-12 border-t border-muted/20">
      <h3 className="text-2xl font-serif font-bold text-heading mb-8">{t('related_posts')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map(post => (
          <Link key={post.slug} href={`/posts/${post.slug}`} className="group block no-underline">
            <article className="flex flex-col h-full">
               <div className="text-xs font-sans text-muted mb-2 flex items-center gap-2">
                 <time className="font-mono">{post.date}</time>
                 <span className="w-1 h-1 rounded-full bg-muted/30" />
                 <span className="uppercase tracking-widest text-[0.6rem] font-semibold text-accent/80">
                   {post.category}
                 </span>
               </div>
               <h4 className="text-lg font-serif font-bold text-heading group-hover:text-accent transition-colors duration-200 mb-2 line-clamp-2">
                 {post.title}
               </h4>
               <p className="text-sm text-foreground/70 font-serif italic line-clamp-3">
                 {post.excerpt}
               </p>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
