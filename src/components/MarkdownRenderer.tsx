import ReactMarkdown, { Components, ExtraProps } from 'react-markdown';
import Mermaid from '@/components/Mermaid';
import CodeBlock from '@/components/CodeBlock';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeImageMetadata from '@/lib/rehype-image-metadata';
import ExportedImage from 'next-image-export-optimizer';
import { PluggableList } from 'unified';

interface MarkdownRendererProps {
  content: string;
  latex?: boolean;
  slug?: string;
}

export default function MarkdownRenderer({ content, latex = false, slug }: MarkdownRendererProps) {
  const remarkPlugins: PluggableList = [remarkGfm];
  const rehypePlugins: PluggableList = [rehypeRaw, rehypeSlug, [rehypeImageMetadata, { slug }]];

  if (latex) {
    remarkPlugins.push(remarkMath);
    rehypePlugins.push(rehypeKatex);
  }

  const components: Components = {
    // Use 'p' by default, but fallback to 'div' only if children contain block elements
    // to avoid invalid HTML nesting warnings while preserving semantics.
    p: ({ children }) => {
      // Check if any child is a block-level element (like Mermaid or CodeBlock)
      // Since children is a ReactNode, we can only do a shallow check here.
      // Simple heuristic: if any child is not a string/number, it *might* be a block.
      // However, react-markdown usually nests blocks at the top level.
      return <p className="mb-4 leading-relaxed text-foreground">{children}</p>;
    },
    // Explicitly style lists to ensure contrast
    li: ({ children }) => <li className="text-foreground">{children}</li>,
    // Explicitly style blockquotes
    blockquote: ({ children }) => <blockquote className="text-foreground border-l-accent italic">{children}</blockquote>,
    // Explicitly style bold text
    strong: ({ children }) => <strong className="text-heading font-semibold">{children}</strong>,
    // Wrap tables in a scrollable container
    table: ({ children, node: _node, ...props }) => {
      return (
        <div className="overflow-x-auto my-8 border border-muted/20 rounded-lg">
          <table {...props} className="min-w-full text-left text-sm">
            {children}
          </table>
        </div>
      );
    },
    // Render 'pre' as a 'div' to allow block-level children
    pre: ({ children }) => <div className="not-prose">{children}</div>,
    // Style links individually to avoid hover-all issue
    a: ({ node: _node, ...props }) => {
      return <a {...props} className="text-accent no-underline hover:underline transition-colors duration-200" />;
    },
    // Custom code renderer: handles 'mermaid' blocks and syntax highlighting
    code({ className, children, node: _node, ...props }: React.ClassAttributes<HTMLElement> & React.HTMLAttributes<HTMLElement> & ExtraProps) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isMultiLine = String(children).includes('\n');
      
      // In react-markdown v10, 'inline' prop is removed. 
      // We use className presence (e.g. language-js) or newline presence to detect code blocks.
      if (match || isMultiLine) {
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
    // Ensure images are responsive and styled, using optimized image if dimensions exist
    // In development mode, use unoptimized images since WebP versions don't exist yet
    img: ({ src, alt, width, height, node: _node, ...props }: React.ClassAttributes<HTMLImageElement> & React.ImgHTMLAttributes<HTMLImageElement> & ExtraProps) => {
      const isDev = process.env.NODE_ENV === 'development';
      const imageSrc = src as string;
      
      if (width && height) {
        return (
          <ExportedImage
            src={imageSrc || ''}
            alt={alt || ''}
            width={Number(width)}
            height={Number(height)}
            className="max-w-full h-auto rounded-lg my-4"
            unoptimized={isDev}
          />
        );
      }
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={imageSrc} alt={alt || ''} {...props} className="max-w-full h-auto rounded-lg my-4" />;
    },
  };

  return (
    <div className="prose prose-lg max-w-none text-foreground
          prose-headings:font-serif prose-headings:text-heading 
          prose-p:text-foreground prose-p:leading-loose
          prose-strong:text-heading prose-strong:font-semibold
          prose-code:bg-muted/15 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-muted/20 prose-code:text-[0.9em] prose-code:font-medium
          prose-code:before:content-none prose-code:after:content-none
          prose-blockquote:italic
          prose-th:text-heading prose-td:text-foreground
          dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
