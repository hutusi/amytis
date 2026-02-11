import { PostData } from '@/lib/markdown';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface SimpleLayoutProps {
  post: PostData;
}

export default function SimpleLayout({ post }: SimpleLayoutProps) {
  return (
    <div className="layout-main">
      <article className="max-w-3xl mx-auto">
        <header className="page-header">
          <h1 className="page-title">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="page-subtitle">
              {post.excerpt}
            </p>
          )}
        </header>

        <MarkdownRenderer content={post.content} latex={post.latex} slug={post.slug} />
      </article>
    </div>
  );
}
