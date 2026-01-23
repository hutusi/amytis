import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { siteConfig } from '../../site.config';

interface PostLayoutProps {
  post: PostData;
}

export default function PostLayout({ post }: PostLayoutProps) {
  return (
    <div className="layout-container">
      <nav className="mb-12">
        <Link 
          href="/" 
          className="text-muted hover:text-accent transition-colors duration-200 font-sans text-sm flex items-center gap-1 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Index</span>
        </Link>
      </nav>

      <article>
        <header className="mb-16 border-b border-muted/10 pb-12">
          {post.draft && (
            <div className="mb-4">
              <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded tracking-widest inline-block">
                DRAFT
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs font-sans text-muted mb-6">
            <span className="uppercase tracking-widest font-semibold text-accent">
              {post.category}
            </span>
            <span className="w-1 h-1 rounded-full bg-muted/30" />
            <time className="font-mono">{post.date}</time>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-bold text-heading leading-tight mb-6">
            {post.title}
          </h1>

          <div className="flex items-center gap-2 mb-8 text-sm font-serif italic text-muted">
            <span>Written by</span>
            <div className="flex items-center gap-1">
              {post.authors.map((author, index) => (
                <span key={author} className="flex items-center">
                  <Link 
                    href={`/authors/${encodeURIComponent(author)}`}
                    className="text-foreground hover:text-accent transition-colors duration-200"
                  >
                    {author}
                  </Link>
                  {index < post.authors.length - 1 && <span className="mr-1">,</span>}
                </span>
              ))}
            </div>
          </div>

          {post.excerpt && (
            <p className="text-xl text-foreground font-serif italic leading-relaxed mb-8">
              {post.excerpt}
            </p>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${tag.toLowerCase()}`}
                  className="px-3 py-1 bg-muted/10 rounded-full text-xs font-medium text-muted hover:bg-accent/10 hover:text-accent transition-colors duration-200"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        <MarkdownRenderer content={post.content} latex={post.latex} />

        <footer className="mt-24 pt-8 border-t border-muted/20 flex justify-between items-center">
          <Link 
            href="/" 
            className="text-muted hover:text-heading transition-colors duration-200 font-serif italic text-sm"
          >
            {siteConfig.title}
          </Link>
          <div className="text-xs text-muted/50 font-mono">
            © {new Date().getFullYear()}
          </div>
        </footer>
      </article>
    </div>
  );
}
