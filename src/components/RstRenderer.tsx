import MarkdownRenderer from '@/components/MarkdownRenderer';
import type { SlugRegistryEntry } from '@/lib/markdown';
import { rstToMarkdown } from '@/lib/rst';

interface RstRendererProps {
  content: string;
  latex?: boolean;
  slug?: string;
  slugRegistry?: Map<string, SlugRegistryEntry>;
}

export default function RstRenderer({ content, latex = false, slug, slugRegistry }: RstRendererProps) {
  return (
    <MarkdownRenderer
      content={rstToMarkdown(content)}
      latex={latex}
      slug={slug}
      slugRegistry={slugRegistry}
    />
  );
}
