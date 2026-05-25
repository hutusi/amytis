"use client";

import { useRef, useState } from 'react';

interface CodeBlockToolbarProps {
  code: string;
}

export default function CodeBlockToolbar({ code }: CodeBlockToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fail silently.
    }
  };

  const handleToggleWrap = () => {
    const next = !wrapped;
    setWrapped(next);
    const root = buttonRef.current?.closest('[data-cb-root]') as HTMLElement | null;
    if (root) {
      if (next) {
        root.setAttribute('data-wrap', 'true');
      } else {
        root.removeAttribute('data-wrap');
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        ref={buttonRef}
        onClick={handleToggleWrap}
        className="text-xs text-muted hover:text-accent transition-colors duration-200 flex items-center gap-1"
        aria-label={wrapped ? 'Disable word wrap' : 'Enable word wrap'}
        aria-pressed={wrapped}
        type="button"
      >
        {wrapped ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M3 12h15a3 3 0 0 1 0 6h-4" />
              <path d="m16 16-2 2 2 2" />
              <path d="M3 18h7" />
            </svg>
            <span>Wrap</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
            <span>No wrap</span>
          </>
        )}
      </button>
      <button
        onClick={handleCopy}
        className="text-xs text-muted hover:text-accent transition-colors duration-200 flex items-center gap-1"
        aria-label="Copy code"
        type="button"
      >
        {copied ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            <span>Copied</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  );
}
