'use client'

import { useState } from 'react';
import { siteConfig } from '../../site.config';
import { useLanguage } from './LanguageProvider';

interface ShareBarProps {
  url: string;
  title: string;
  excerpt?: string;
  layout?: 'horizontal' | 'vertical';
  className?: string;
}

type Platform = 'twitter' | 'facebook' | 'linkedin' | 'weibo' | 'hackernews' | 'copy';

function getShareUrl(platform: Platform, url: string, title: string): string | null {
  const eu = encodeURIComponent(url);
  const et = encodeURIComponent(title);
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${et}&url=${eu}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${eu}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${eu}`;
    case 'weibo':
      return `https://service.weibo.com/share/share.php?url=${eu}&title=${et}`;
    case 'hackernews':
      return `https://news.ycombinator.com/submitlink?u=${eu}&t=${et}`;
    case 'copy':
      return null;
  }
}

function PlatformIcon({ platform }: { platform: Platform }) {
  switch (platform) {
    case 'twitter':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M12.6 1h2.4L9.8 6.6 16 15h-4.4l-3.4-4.4L4.4 15H2l5.5-6L0 1h4.5l3.1 4L12.6 1zm-.8 12.6h1.3L4.3 2.3H2.9l9 11.3z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M16 8a8 8 0 1 0-9.25 7.903V10.25H4.719V8H6.75V6.234c0-2.005 1.194-3.113 3.022-3.113.875 0 1.79.156 1.79.156V5.25h-1.008c-.994 0-1.304.617-1.304 1.25V8h2.219l-.355 2.25H9.25v5.653A8.003 8.003 0 0 0 16 8z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.824 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z" />
        </svg>
      );
    case 'weibo':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M7.05 10.8c-.28.52-.88.7-1.34.41-.45-.28-.57-.9-.28-1.4.28-.5.86-.69 1.32-.43.46.26.6.89.3 1.42zm1.57-1.3c-.1.28-.4.42-.65.32-.25-.1-.36-.4-.26-.68.1-.27.38-.41.63-.31.25.09.38.4.28.67zm1.32-5.13C7.47 4.05 4.8 5.35 4.06 7.7c-.15.47-.17.91-.1 1.34C2.1 9.39 1 10.73 1 12.25c0 1.95 2.16 3.5 4.83 3.5 2.68 0 4.83-1.55 4.83-3.5 0-.57-.19-1.12-.54-1.6.17-.08.32-.19.45-.33.82-.9.6-2.32-.4-3.95zm-3.2 7.43c-1.77.16-3.3-.7-3.41-1.91-.12-1.22 1.22-2.33 2.99-2.49 1.77-.16 3.3.7 3.41 1.92.12 1.21-1.22 2.32-2.99 2.48zm5.7-7.32c-.27-.81-1-1.43-1.9-1.57.17-.43.19-.9.05-1.36-.39-1.27-1.74-1.96-3.01-1.54-.15.05-.3.11-.44.19.64-1.53 2.14-2.5 3.77-2.23 2 .32 3.33 2.3 2.98 4.42-.07.42-.2.82-.39 1.18a2.6 2.6 0 0 0-1.06.91z" />
        </svg>
      );
    case 'hackernews':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M0 0h16v16H0V0zm9.07 8.4 2.8-5.2H10.4L8.01 7.7 5.62 3.2H4.13l2.8 5.2v3.4h2.14V8.4z" />
        </svg>
      );
    case 'copy':
      return (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9q-.13 0-.25.03A2 2 0 0 1 7 9H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z" />
          <path d="M9 5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 7h3a2 2 0 1 1 0 4h-1.535a4 4 0 0 1-.82 1H12a3 3 0 1 0 0-6z" />
        </svg>
      );
  }
}

function platformLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    twitter: 'X / Twitter',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    weibo: '微博',
    hackernews: 'Hacker News',
    copy: 'Copy',
  };
  return labels[platform];
}

export default function ShareBar({ url, title, layout = 'horizontal', className = '' }: ShareBarProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const platforms = siteConfig.share?.platforms as Platform[] | undefined;
  if (!platforms || platforms.length === 0) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const isVertical = layout === 'vertical';

  return (
    <div className={`${isVertical ? 'flex flex-col gap-2' : 'flex flex-row flex-wrap gap-2'} ${className}`}>
      {platforms.map((platform) => {
        const shareUrl = getShareUrl(platform, url, title);
        const label = platform === 'copy'
          ? (copied ? t('link_copied') : t('copy_link'))
          : platformLabel(platform);

        if (platform === 'copy') {
          return (
            <button
              key={platform}
              onClick={handleCopy}
              title={label}
              aria-label={label}
              className={`inline-flex items-center gap-2 text-muted hover:text-accent transition-colors ${
                isVertical ? 'text-[11px]' : 'p-1.5 rounded hover:bg-muted/10'
              }`}
            >
              <PlatformIcon platform={platform} />
              {isVertical && (
                <span className={`text-[11px] font-sans ${copied ? 'text-accent' : ''}`}>{label}</span>
              )}
            </button>
          );
        }

        return (
          <a
            key={platform}
            href={shareUrl!}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={`Share on ${label}`}
            className={`inline-flex items-center gap-2 text-muted hover:text-accent transition-colors no-underline ${
              isVertical ? 'text-[11px]' : 'p-1.5 rounded hover:bg-muted/10'
            }`}
          >
            <PlatformIcon platform={platform} />
            {isVertical && (
              <span className="text-[11px] font-sans">{label}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}
