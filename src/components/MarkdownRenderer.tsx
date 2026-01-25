import ReactMarkdown from 'react-markdown';
import Mermaid from '@/components/Mermaid';
import CodeBlock from '@/components/CodeBlock';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';

interface MarkdownRendererProps {
  content: string;
  latex?: boolean;
}

export default function MarkdownRenderer({ content, latex = false }: MarkdownRendererProps) {
  const remarkPlugins: any[] = [remarkGfm];
  const rehypePlugins: any[] = [rehypeRaw, rehypeSlug];

  if (latex) {
    remarkPlugins.push(remarkMath);
    rehypePlugins.push(rehypeKatex);
  }

  return (
    <div className="prose prose-lg max-w-none text-foreground
          prose-headings:font-serif prose-headings:text-heading 
          prose-p:text-foreground prose-p:leading-loose
          prose-a:text-accent prose-a:no-underline hover:prose-a:underline
          prose-strong:text-heading prose-strong:font-semibold
          prose-code:bg-muted/15 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-muted/20 prose-code:text-[0.9em] prose-code:font-medium
          prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:italic
          prose-th:text-heading prose-td:text-foreground
          dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // Use 'div' instead of 'p' to avoid hydration errors
          p: ({ children }) => <div className="mb-4 leading-relaxed text-foreground">{children}</div>,
          // Explicitly style lists to ensure contrast
          li: ({ children }) => <li className="text-foreground">{children}</li>,
          // Explicitly style blockquotes
          blockquote: ({ children }) => <blockquote className="text-foreground border-l-accent italic">{children}</blockquote>,
          // Explicitly style bold text
          strong: ({ children }) => <strong className="text-heading font-semibold">{children}</strong>,
          // Render 'pre' as a 'div' to allow block-level children
          pre: ({ children }) => <div className="not-prose">{children}</div>,
          // Style links individually to avoid hover-all issue
          a: (props) => <a {...props} className="text-accent no-underline hover:underline transition-colors duration-200" />,
          // Custom code renderer: handles 'mermaid' blocks and syntax highlighting
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const isMultiLine = String(children).includes('\n');
            
            if (!inline && (match || isMultiLine)) {
              if (language === 'mermaid') {
                return <Mermaid chart={String(children).replace(/\n$/, '')} />;
              }
              return (
                <CodeBlock language={language} {...props}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Ensure images are responsive and styled
          img: (props) => <img {...props} className="max-w-full h-auto rounded-lg my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
