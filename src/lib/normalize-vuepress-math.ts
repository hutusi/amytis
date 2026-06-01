const FENCE_OPEN_RE = /^[ \t]*(`{3,}|~{3,})/;

/**
 * VuePress's math plugin accepts block math with the `$$` markers on the
 * same line as the math body — `$$ \mathbf{A} = \begin{bmatrix}` opening
 * and `\end{bmatrix} $$` closing. `remark-math` (the upstream micromark
 * extension) is stricter: a block-math opener must be on its own line and
 * the closer must be on its own line. When that's violated, the parser
 * falls back to *inline* math — which either explodes in KaTeX (when the
 * body contains `\\` line breaks or `&` column separators) or silently
 * mis-renders as inline (no `katex-display` wrapper, so it loses block
 * margin and centering even though it visually looks fine).
 *
 * This pre-processor splits VuePress-style fences onto their own lines
 * before parsing, so imported chapters render correctly without touching
 * their source files. Two cases:
 *
 *   $$ \mathbf{A} = \begin{bmatrix}        $$
 *   a & b \\               becomes →       \mathbf{A} = \begin{bmatrix}
 *   c & d                                  a & b \\
 *   \end{bmatrix} $$                       c & d
 *                                          \end{bmatrix}
 *                                          $$
 *
 *                                          $$
 *   $$ x = y $$           becomes →        x = y
 *                                          $$
 *
 * - Inline math (`$x$`, with a single `$`) is never matched — only `$$`.
 * - Empty single-line blocks (`$$$$`, `$$  $$`) are left alone.
 * - Fenced code blocks (``` and ~~~) are skipped so code samples that
 *   *show* the VuePress syntax verbatim aren't mutated. Fence semantics
 *   match CommonMark: closer must be the same character type and at
 *   least as long as the opener.
 *
 * Idempotent: re-running on already-normalized content is a no-op, so
 * it's safe to apply unconditionally whenever LaTeX rendering is on.
 */
export function normalizeVuepressBlockMath(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let inMath = false;
  let openFence: string | null = null;
  // Indent of the current block-math opener — preserved on every emitted
  // synthetic line so list-item-nested math (4-space indent inside a `-`
  // bullet) doesn't lose its list context when we split the opener / closer.
  let blockIndent = '';

  for (const line of lines) {
    if (openFence !== null) {
      // Inside a code fence — pass through verbatim, just track close.
      out.push(line);
      const closeRe = new RegExp(`^[ \\t]*${openFence[0]}{${openFence.length},}\\s*$`);
      if (closeRe.test(line)) openFence = null;
      continue;
    }

    const fenceOpen = line.match(FENCE_OPEN_RE);
    if (fenceOpen) {
      openFence = fenceOpen[1];
      out.push(line);
      continue;
    }

    if (!inMath) {
      // Match an opener with content tacked on after `$$`. The trimmed body
      // must NOT itself end in `$$` — that would make it a single-line block.
      const m = line.match(/^([ \t]*)\$\$(.+)$/);
      if (m) {
        const rest = m[2].trimEnd();
        if (rest.endsWith('$$')) {
          // Single-line block math like `$$ x $$`. micromark-extension-math
          // parses this as *inline* math (no `katex-display` wrapper), so
          // expand it to opener / body / closer on three lines.
          const body = rest.slice(0, -2).trim();
          if (body.length === 0) {
            // `$$$$` or `$$  $$` — degenerate, leave alone.
            out.push(line);
            continue;
          }
          out.push(`${m[1]}$$`);
          out.push(`${m[1]}${body}`);
          out.push(`${m[1]}$$`);
          continue;
        }
        blockIndent = m[1];
        out.push(`${blockIndent}$$`);
        // Re-apply the opener's indent on the math body so list-nested
        // blocks stay inside their list item. Trim only the gap between
        // `$$` and the actual math content (e.g. `$$ \mathbf{A}` → `\mathbf{A}`).
        out.push(`${blockIndent}${m[2].trimStart()}`);
        inMath = true;
        continue;
      }
      out.push(line);
      continue;
    }

    // Inside a block-math run started above. Look for an inline closer.
    const close = line.match(/^(.*?)[ \t]*\$\$[ \t]*$/);
    if (close && !line.trim().startsWith('$$')) {
      // Closer with content before `$$` on the same line — split.
      // `close[1]` already includes its own leading whitespace, so we don't
      // need to re-apply blockIndent to it; we only need to indent the `$$`.
      if (close[1].length > 0) out.push(close[1]);
      out.push(`${blockIndent}$$`);
      inMath = false;
      blockIndent = '';
      continue;
    }
    out.push(line);
    if (line.trim() === '$$') {
      inMath = false;
      blockIndent = '';
    }
  }
  return out.join('\n');
}
