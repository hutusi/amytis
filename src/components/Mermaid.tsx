"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "next-themes";

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ref.current && chart && mounted) {
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
    <div className="my-8 p-4 md:p-8 rounded-lg border border-muted/20 bg-muted/5 overflow-x-auto shadow-sm">
      <div
        className="mermaid w-full flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
        ref={ref}
      />
    </div>
  );
};

export default Mermaid;
