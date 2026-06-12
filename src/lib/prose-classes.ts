/**
 * The article prose styling shared by both content renderers.
 * MarkdownRenderer (react-markdown tree) and RstRenderer (sanitized HTML)
 * must style body content identically — a Markdown post and an rST post
 * should be indistinguishable typographically.
 */
export const PROSE_CLASSES = `prose prose-lg max-w-none min-w-0 overflow-x-hidden text-foreground
      prose-headings:font-serif prose-headings:text-heading
      prose-p:text-foreground prose-p:leading-loose
      prose-strong:text-heading prose-strong:font-semibold
      prose-code:bg-ink/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:border prose-code:border-ink/[0.08] prose-code:text-[0.9em] prose-code:font-medium
      prose-code:before:content-none prose-code:after:content-none
      prose-blockquote:italic
      prose-th:text-heading prose-td:text-foreground
      dark:prose-invert`;
