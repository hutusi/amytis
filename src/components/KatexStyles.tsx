import "katex/dist/katex.min.css";

// Rendered by MarkdownRenderer/RstRenderer only when a post has latex: true.
// IMPORTANT: consumers must load this via next/dynamic, not a static import —
// a static import executes the CSS side-effect at module load, which bundles
// katex.min.css (~23 KB) into every article chunk even for math-free posts.
// The dynamic boundary is what actually gives the CSS its own chunk.
export default function KatexStyles() {
  return null;
}
