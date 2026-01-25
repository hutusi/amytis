import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { siteConfig } from '../../site.config';

interface SimpleLayoutProps {
  post: PostData;
}

export default function SimpleLayout({ post }: SimpleLayoutProps) {
  return (
    <div className="layout-container">
      <article>
        <header className="mb-16 border-b border-muted/10 pb-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-heading leading-tight mb-4">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-xl text-muted font-serif italic">
              {post.excerpt}
            </p>
          )}
        </header>

        <MarkdownRenderer content={post.content} latex={post.latex} slug={post.slug} />


      </article>
    </div>
  );
}
