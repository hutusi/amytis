'use client';

import { useState } from 'react';
import { siteConfig } from '../../site.config';
import { LuCopy, LuCheck } from 'react-icons/lu';

function FeedRow({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/5 border border-muted/15 not-prose">
      {label && <span className="text-xs font-medium text-muted/40 shrink-0 uppercase tracking-wide">{label}</span>}
      <code className="text-xs font-mono text-muted/60 flex-1 truncate">{url}</code>
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

export default function RssFeedWidget() {
  const base = siteConfig.baseUrl.replace(/\/+$/, '');
  const { format } = siteConfig.feed;
  const showBoth = format === 'both';

  return (
    <div className="my-4 flex flex-col gap-2">
      {(format === 'rss' || format === 'both') && (
        <FeedRow url={`${base}/feed.xml`} label={showBoth ? 'RSS' : undefined} />
      )}
      {(format === 'atom' || format === 'both') && (
        <FeedRow url={`${base}/feed.atom`} label={showBoth ? 'Atom' : undefined} />
      )}
    </div>
  );
}
