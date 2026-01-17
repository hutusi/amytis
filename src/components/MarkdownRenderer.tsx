import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Mermaid from '@/components/Mermaid';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none 
          prose-headings:font-serif prose-headings:text-heading 
          prose-p:text-foreground prose-p:leading-loose
          prose-a:text-accent prose-a:no-underline hover:prose-a:underline
          prose-strong:text-heading prose-strong:font-semibold
          prose-code:text-accent prose-code:bg-muted/10 prose-code:px-1 prose-code:rounded
          prose-blockquote:border-l-accent prose-blockquote:text-muted prose-blockquote:italic
          dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Use 'div' instead of 'p' to avoid hydration errors
          p: ({ children }) => <div className="mb-4 leading-relaxed">{children}</div>,
          // Render 'pre' as a 'div' to allow block-level children
          pre: ({ children }) => <div className="not-prose">{children}</div>,
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
