import Link from 'next/link';
import type { PostData } from '@/lib/content/types';
import { t } from '@/lib/i18n';
import { getPostUrl } from '@/lib/urls';
import MetaDot from './ui/MetaDot';

export default function RelatedPosts({ posts }: { posts: PostData[] }) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-serif font-bold text-heading mb-8">{t('related_posts')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map(post => (
          <Link key={post.slug} href={getPostUrl(post)} className="group block no-underline">
            <article className="ink-card flex flex-col h-full p-5 transition-colors group-hover:border-accent/30">
               <div className="text-xs font-sans text-muted mb-2 flex items-center gap-2">
                 <time className="font-mono">{post.date}</time>
                 <MetaDot />
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
