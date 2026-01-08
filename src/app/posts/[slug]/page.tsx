import { getPostBySlug, getAllPosts } from '@/lib/markdown';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Mermaid from '@/components/Mermaid';
import { siteConfig } from '../../../../site.config';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
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
            <Link 
              href={`/authors/${encodeURIComponent(post.author)}`}
              className="text-foreground hover:text-accent transition-colors duration-200"
            >
              {post.author}
            </Link>
          </div>

          {post.excerpt && (
            <p className="text-xl text-foreground/80 font-serif italic leading-relaxed mb-8">
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

        <div className="prose prose-lg max-w-none 
          prose-headings:font-serif prose-headings:text-heading 
          prose-p:text-foreground prose-p:leading-loose
          prose-a:text-accent prose-a:no-underline hover:prose-a:underline
          prose-strong:text-heading prose-strong:font-semibold
          prose-code:text-accent prose-code:bg-muted/10 prose-code:px-1 prose-code:rounded
          prose-blockquote:border-l-accent prose-blockquote:text-muted prose-blockquote:italic
          dark:prose-invert">
          <ReactMarkdown
            components={{
              pre: ({ children }) => <>{children}</>,
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                if (!inline) {
                  if (language === 'mermaid') {
                    return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                  }
                  return (
                    <SyntaxHighlighter
                      style={oneLight}
                      language={language || 'text'}
                      PreTag="div"
                      customStyle={{
                        background: 'var(--background)',
                        border: '1px solid var(--muted)',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        padding: '1.5rem',
                        opacity: 0.9
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  );
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>

      <footer className="mt-24 pt-8 border-t border-muted/20 flex justify-between items-center">
        <Link 
          href="/" 
          className="text-muted hover:text-heading transition-colors duration-200 font-serif italic text-sm"
        >
          {siteConfig.title} Digital Garden
        </Link>
        <div className="text-xs text-muted/50 font-mono">
          © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}