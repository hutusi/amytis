import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { siteConfig } from '../../site.config';

interface SimpleLayoutProps {
  post: PostData;
}

export default function SimpleLayout({ post }: SimpleLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
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

        <MarkdownRenderer content={post.content} />

        <footer className="mt-24 pt-8 border-t border-muted/20 text-center">
          <Link 
            href="/" 
            className="text-muted hover:text-heading transition-colors duration-200 font-serif italic text-sm"
          >
            Back to Home
          </Link>
        </footer>
      </article>
    </div>
  );
}
