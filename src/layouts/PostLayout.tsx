import Link from 'next/link';
import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import TableOfContents from '@/components/TableOfContents';
import { siteConfig } from '../../site.config';

interface PostLayoutProps {
  post: PostData;
}

export default function PostLayout({ post }: PostLayoutProps) {
  const showToc = siteConfig.toc !== false && post.toc !== false && post.headings && post.headings.length > 0;

  return (
    <div className={`layout-container ${showToc ? 'lg:max-w-6xl' : ''}`}>
      <nav className="mb-12">
        <Link 
          href="/" 
          className="text-muted hover:text-accent transition-colors duration-200 font-sans text-sm flex items-center gap-1 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span>Index</span>
        </Link>
      </nav>

      <div className={`grid grid-cols-1 ${showToc ? 'lg:grid-cols-[1fr_250px]' : ''} gap-12 items-start`}>
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
                          <span className="w-1 h-1 rounded-full bg-muted/30" />
                          <span className="font-mono">{post.readingTime}</span>
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
        </article>

        {showToc && <TableOfContents headings={post.headings} />}
      </div>
    </div>
  );
}
