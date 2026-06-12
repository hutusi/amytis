import { toHtml } from 'hast-util-to-html';
import CodeBlockToolbar from './CodeBlockToolbar';
import { getLanguageDisplayName, highlightToHast } from '@/lib/shiki';

interface CodeBlockProps {
  language: string;
  children: string;
  title?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export default async function CodeBlock({
  language,
  children,
  title,
  showLineNumbers,
  highlightLines,
}: CodeBlockProps) {
  const hast = await highlightToHast(children, language, {
    showLineNumbers,
    highlightLines,
    title,
  });
  const html = toHtml(hast);
  const displayLang = getLanguageDisplayName(language || 'text');

  return (
    <div
      data-cb-root=""
      className="cb-root relative my-6 w-full min-w-0 max-w-full rounded-lg border border-ink/[0.07] bg-background/50 overflow-hidden shadow-sm"
    >
      <div className="cb-header flex items-center justify-between px-4 py-2 border-b border-ink/[0.05] bg-ink/[0.02] gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="cb-lang text-xs font-mono text-muted tracking-wider">
            {displayLang}
          </span>
          {title && (
            <span className="cb-title truncate text-xs text-foreground/80" title={title}>
              {title}
            </span>
          )}
        </div>
        <CodeBlockToolbar code={children} />
      </div>
      <div
        className="cb-scroll w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
