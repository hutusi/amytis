'use client'

import { useState } from 'react';
import { IconType } from 'react-icons';
import { FaXTwitter, FaFacebook, FaLinkedin, FaWeibo, FaRedditAlien, FaTelegram, FaMastodon, FaHackerNews } from 'react-icons/fa6';
import { SiBluesky, SiDouban, SiZhihu } from 'react-icons/si';
import { LuLink, LuCheck } from 'react-icons/lu';
import { siteConfig } from '../../site.config';
import { useLanguage } from './LanguageProvider';

interface ShareBarProps {
  url: string;
  title: string;
  excerpt?: string;
  className?: string;
}

type Platform =
  | 'twitter' | 'facebook' | 'linkedin' | 'weibo'
  | 'reddit' | 'hackernews' | 'telegram' | 'bluesky' | 'mastodon'
  | 'douban' | 'zhihu'
  | 'copy';

const PLATFORM_META: Record<Platform, { label: string; Icon: IconType }> = {
  twitter:    { label: 'X / Twitter', Icon: FaXTwitter },
  facebook:   { label: 'Facebook',    Icon: FaFacebook },
  linkedin:   { label: 'LinkedIn',    Icon: FaLinkedin },
  weibo:      { label: '微博',         Icon: FaWeibo },
  reddit:     { label: 'Reddit',      Icon: FaRedditAlien },
  hackernews: { label: 'Hacker News', Icon: FaHackerNews },
  telegram:   { label: 'Telegram',    Icon: FaTelegram },
  bluesky:    { label: 'Bluesky',     Icon: SiBluesky },
  mastodon:   { label: 'Mastodon',    Icon: FaMastodon },
  douban:     { label: '豆瓣',         Icon: SiDouban },
  zhihu:      { label: '知乎',         Icon: SiZhihu },
  copy:       { label: 'Copy link',   Icon: LuLink },
};

function getShareUrl(platform: Platform, url: string, title: string): string {
  const eu = encodeURIComponent(url);
  const et = encodeURIComponent(title);
  const combined = encodeURIComponent(`${title} ${url}`);
  switch (platform) {
    case 'twitter':    return `https://twitter.com/intent/tweet?text=${et}&url=${eu}`;
    case 'facebook':   return `https://www.facebook.com/sharer/sharer.php?u=${eu}`;
    case 'linkedin':   return `https://www.linkedin.com/sharing/share-offsite/?url=${eu}`;
    case 'weibo':      return `https://service.weibo.com/share/share.php?url=${eu}&title=${et}`;
    case 'reddit':     return `https://www.reddit.com/submit?url=${eu}&title=${et}`;
    case 'hackernews': return `https://news.ycombinator.com/submitlink?u=${eu}&t=${et}`;
    case 'telegram':   return `https://t.me/share/url?url=${eu}&text=${et}`;
    case 'bluesky':    return `https://bsky.app/intent/compose?text=${combined}`;
    case 'mastodon':   return `https://mastodon.social/share?text=${combined}`;
    case 'douban':     return `https://www.douban.com/share/service?href=${eu}&name=${et}`;
    case 'zhihu':      return `https://www.zhihu.com/share?href=${eu}&type=text&title=${et}`;
    case 'copy':       return '';
  }
}

export default function ShareBar({ url, title, className = '' }: ShareBarProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!siteConfig.share?.enabled) return null;
  const configured = siteConfig.share?.platforms ?? [];
  const platforms = configured.filter((p): p is Platform => p in PLATFORM_META);
  if (platforms.length === 0) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const btnClass = 'inline-flex items-center justify-center w-8 h-8 rounded text-muted hover:text-accent hover:bg-muted/10 transition-colors';

  return (
    <div className={`flex flex-row flex-wrap gap-1 ${className}`}>
      {platforms.map((platform) => {
        const { label, Icon } = PLATFORM_META[platform];

        if (platform === 'copy') {
          const copyLabel = copied ? t('link_copied') : t('copy_link');
          return (
            <button
              key={platform}
              onClick={handleCopy}
              title={copyLabel}
              aria-label={copyLabel}
              className={`${btnClass} ${copied ? 'text-accent' : ''}`}
            >
              {copied ? <LuCheck size={16} /> : <Icon size={16} />}
            </button>
          );
        }

        return (
          <a
            key={platform}
            href={getShareUrl(platform, url, title)}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={`Share on ${label}`}
            className={`${btnClass} no-underline`}
          >
            <Icon size={16} />
          </a>
        );
      })}
    </div>
  );
}
