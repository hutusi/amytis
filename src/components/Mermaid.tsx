"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    background: "#fafaf9",
    mainBkg: "#fafaf9",
    primaryColor: "#fafaf9",
    primaryBorderColor: "#059669",
    primaryTextColor: "#1c1917",
    secondaryColor: "#e7e5e4",
    tertiaryColor: "#fafaf9",
    lineColor: "#44403c",
    textColor: "#44403c",
  },
  securityLevel: "loose",
});

interface MermaidProps {
  chart: string;
}

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (ref.current && chart) {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      mermaid.render(id, chart).then(({ svg }) => {
        setSvg(svg);
      });
    }
  }, [chart]);

  return (
    <div
      className="mermaid flex justify-center my-8"
      dangerouslySetInnerHTML={{ __html: svg }}
      ref={ref}
    />
  );
};

export default Mermaid;
