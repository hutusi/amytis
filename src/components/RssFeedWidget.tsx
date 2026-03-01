'use client';

import { useState } from 'react';
import { siteConfig } from '../../site.config';
import { LuCopy, LuCheck } from 'react-icons/lu';

export default function RssFeedWidget() {
  const [copied, setCopied] = useState(false);
  const feedUrl = `${siteConfig.baseUrl.replace(/\/+$/, '')}/feed.xml`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 my-4 rounded-lg bg-muted/5 border border-muted/15 not-prose">
      <code className="text-xs font-mono text-muted/60 flex-1 truncate">{feedUrl}</code>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-muted/60 hover:text-accent transition-colors"
        aria-label="Copy feed URL"
      >
        {copied
          ? <><LuCheck className="w-3.5 h-3.5 text-accent" /><span className="text-accent">Copied!</span></>
          : <><LuCopy className="w-3.5 h-3.5" /><span>Copy</span></>
        }
      </button>
    </div>
  );
}
