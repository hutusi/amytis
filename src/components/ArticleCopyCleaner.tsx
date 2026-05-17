'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const KEEP_BG_SELECTOR = 'pre, code, blockquote, .admonition, [class*="admonition"]';
const STRIP_BG_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, ul, ol, li, div, span, td, th, tr, article, section';

function isMeaningfulBg(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (v === 'transparent' || v === 'rgba(0, 0, 0, 0)' || v === 'rgb(0, 0, 0, 0)') return false;
  return true;
}

export default function ArticleCopyCleaner({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const anchor = range.commonAncestorContainer;
      if (!(anchor instanceof Node) || !root.contains(anchor)) return;

      const sandbox = document.createElement('div');
      sandbox.setAttribute('aria-hidden', 'true');
      sandbox.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;';
      sandbox.appendChild(range.cloneContents());
      root.appendChild(sandbox);

      try {
        sandbox.querySelectorAll<HTMLElement>(KEEP_BG_SELECTOR).forEach((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          if (isMeaningfulBg(bg)) el.style.backgroundColor = bg;
        });

        sandbox.querySelectorAll<HTMLElement>(STRIP_BG_SELECTOR).forEach((el) => {
          if (el.matches(KEEP_BG_SELECTOR)) return;
          el.style.removeProperty('background-color');
          el.style.removeProperty('background');
        });

        const clipboard = event.clipboardData;
        if (!clipboard) return;

        clipboard.setData('text/html', sandbox.innerHTML);
        clipboard.setData('text/plain', selection.toString());
        event.preventDefault();
      } finally {
        sandbox.remove();
      }
    };

    root.addEventListener('copy', handleCopy);
    return () => root.removeEventListener('copy', handleCopy);
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
