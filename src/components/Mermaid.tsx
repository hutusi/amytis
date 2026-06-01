"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";

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
 * Client-side component for rendering Mermaid charts.
 * Takes a mermaid chart definition string and renders it to SVG.
 */
const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to avoid cascading render lint error
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (ref.current && chart && mounted) {
      installConsoleWarnFilter();
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const isDark = currentTheme === 'dark';

      // Colors matching globals.css
      const colors = {
        background: isDark ? "#1c1917" : "#fafaf9", // Stone 900 / 50
        primary: isDark ? "#1c1917" : "#fafaf9",
        text: isDark ? "#fafaf9" : "#1c1917", // Stone 50 / 900
        border: isDark ? "#34d399" : "#059669", // Emerald 400 / 600
        line: isDark ? "#57534e" : "#a8a29e", // Stone 600 / 400
      };

      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        fontFamily: "var(--font-sans)",
        themeVariables: {
          background: colors.background,
          mainBkg: colors.background,
          primaryColor: colors.primary,
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
        securityLevel: "loose",
      });

      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.render(id, chart)
        .then(({ svg }) => {
          setSvg(svg);
        })
        .catch((error) => {
          console.error("Mermaid rendering error:", error);
          setSvg(`<div class="p-4 text-red-500 bg-red-50 border border-red-200 rounded text-sm font-mono">Failed to render diagram. Syntax error?</div>`);
        });
    }
  }, [chart, theme, systemTheme, mounted]);

  return (
    <div className="my-6 overflow-x-auto">
      {/*
        suppressHydrationWarning is intentional: Mermaid runs client-side
        in `useEffect`, injects its SVG via `dangerouslySetInnerHTML`, and
        then mutates the DOM further (adding `data-processed="true"` on
        this wrapper). React's virtual DOM has no record of those
        mutations, so any HMR-triggered re-render in dev flags the drift
        as a hydration mismatch. Telling React this div is
        intentionally-mutated terrain is the blessed escape hatch.
      */}
      <div
        className="mermaid w-full flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
        ref={ref}
        suppressHydrationWarning
      />
    </div>
  );
};

export default Mermaid;
