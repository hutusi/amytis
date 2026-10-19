"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLanguage } from "./LanguageProvider";

// Mermaid bundles its own KaTeX and invokes it with `{throwOnError: true,
// displayMode: true, output: 'mathml'}` — no `strict` option, so KaTeX
// defaults to `'warn'` and floods the console with one warning per CJK
// character in math labels (e.g. `S["$$解码器状态：s_{t-1}$$"]`). There is
// no `mermaid.initialize()` setting to override this. Filter the very
// specific KaTeX warning template at the console layer; everything else
// passes through. Idempotent under HMR.
let consoleWarnFilterInstalled = false;
function installConsoleWarnFilter(): void {
  if (consoleWarnFilterInstalled || typeof window === "undefined") return;
  consoleWarnFilterInstalled = true;
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("[unicodeTextInMathMode]")) {
      return;
    }
    originalWarn(...args);
  };
}

interface MermaidProps {
  chart: string;
}

/**
 * The site's palette for the current theme, read from the CSS variables in
 * globals.css (so palettes and the dark theme apply, instead of hard-coded
 * emerald). Called after the async mermaid import, by which point a theme
 * toggle has already re-classed <html>.
 */
function readThemeColors(isDark: boolean) {
  const style = getComputedStyle(document.body);
  const cssVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    background: cssVar("--background", isDark ? "#292524" : "#fafaf9"),
    text: cssVar("--heading", isDark ? "#fafaf9" : "#1c1917"),
    border: cssVar("--accent", isDark ? "#34d399" : "#047857"),
    line: cssVar("--muted", isDark ? "#a8a29e" : "#78716c"),
  };
}

/**
 * Client-side component for rendering Mermaid charts.
 *
 * The ~600 KB mermaid library (plus a diagram-type chunk) loads only once
 * the diagram is within 200px of the viewport, so a long chapter with a
 * diagram near the end doesn't pay for it on load. Until then a placeholder
 * reserves space to limit layout shift.
 */
const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [inView, setInView] = useState(false);
  const [svg, setSvg] = useState<string>("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const rafId = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(rafId);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !chart) return;

    let cancelled = false;

    (async () => {
      // One try/catch over the whole pipeline: a failed dynamic import (chunk
      // load error) or initialize() must surface the error UI too, not just a
      // render() failure — otherwise the diagram silently stays blank.
      try {
        installConsoleWarnFilter();

        const mermaid = (await import("mermaid")).default;
        if (cancelled) return;

        const colors = readThemeColors(resolvedTheme === "dark");

        // initialize() runs per render: the theme variables change with the
        // site theme, and mermaid has no per-render theme option.
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          fontFamily: "var(--font-sans)",
          themeVariables: {
            background: colors.background,
            mainBkg: colors.background,
            primaryColor: colors.background,
            primaryTextColor: colors.text,
            primaryBorderColor: colors.border,
            lineColor: colors.line,
            secondaryColor: colors.background,
            tertiaryColor: colors.background,
            noteBkgColor: colors.background,
            noteTextColor: colors.text,
            noteBorderColor: colors.line,
          },
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
          sequence: { useMaxWidth: true, showSequenceNumbers: true },
          er: { useMaxWidth: true },
          // "antiscript" keeps HTML labels (and math in labels) but runs
          // mermaid's DOMPurify pass over the output; "loose" skipped it,
          // which matters for diagrams from imported third-party books.
          securityLevel: "antiscript",
          // Without this a parse error leaves mermaid's "Syntax error" SVG
          // orphaned in <body> (once per render, i.e. per theme toggle).
          suppressErrorRendering: true,
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
        const { svg } = await mermaid.render(id, chart);
        if (cancelled) return;
        setSvg(svg);
        setFailed(false);
      } catch (error) {
        if (cancelled) return;
        console.error("Mermaid rendering error:", error);
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, inView, resolvedTheme]);

  return (
    <div ref={ref} className="my-6 overflow-x-auto">
      {failed ? (
        <p role="note" className="m-0 rounded-lg border border-line bg-ink/[0.03] p-4 text-sm text-muted">
          {t("diagram_render_error")}
        </p>
      ) : (
        /*
          suppressHydrationWarning is intentional: Mermaid runs client-side
          in `useEffect`, injects its SVG via `dangerouslySetInnerHTML`, and
          then mutates the DOM further (adding `data-processed="true"` on
          this wrapper). React's virtual DOM has no record of those
          mutations, so any HMR-triggered re-render in dev flags the drift
          as a hydration mismatch. Telling React this div is
          intentionally-mutated terrain is the blessed escape hatch.
        */
        <div
          className={`mermaid w-full flex justify-center${svg ? "" : " min-h-40 rounded-lg bg-ink/[0.02]"}`}
          aria-busy={!svg}
          dangerouslySetInnerHTML={{ __html: svg }}
          suppressHydrationWarning
        />
      )}
    </div>
  );
};

export default Mermaid;
