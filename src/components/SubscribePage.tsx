'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { siteConfig } from '../../site.config';
import { LuCheck, LuCopy, LuExternalLink, LuGithub, LuMail } from 'react-icons/lu';

// ─── Platform SVG icons ────────────────────────────────────────────────────────

function RssIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20 4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WechatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-3.518 3.507c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
    </svg>
  );
}

function SubstackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.775-8.906L2.003 2.25H8.08l4.261 5.628 5.903-5.628zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ─── Shared card wrapper ───────────────────────────────────────────────────────

interface CardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
}

function SubscribeCard({ icon, title, description, children, wide }: CardProps) {
  return (
    <div className={`rounded-2xl border border-muted/20 bg-muted/5 p-6 space-y-4${wide ? ' md:col-span-2' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
          {icon}
        </div>
        <h2 className="font-serif font-bold text-xl text-heading">{title}</h2>
      </div>
      <p className="text-sm text-muted/70 leading-relaxed">{description}</p>
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SubscribePage() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const { baseUrl, social, subscribe } = siteConfig;
  const feedUrl = `${baseUrl}/feed.xml`;
  const enc = encodeURIComponent(feedUrl);

  const rssReaders = [
    { name: 'Follow',     url: `https://app.follow.is/add?url=${enc}` },
    { name: 'Feedly',     url: `https://feedly.com/i/subscription/feed/${enc}` },
    { name: 'Inoreader',  url: `https://www.inoreader.com/?add_feed=${enc}` },
    { name: 'NewsBlur',   url: `https://newsblur.com/?url=${enc}` },
    { name: 'The Old Reader', url: `https://theoldreader.com/feeds/subscribe?url=${enc}` },
  ];

  const hasSubstack = !!subscribe?.substack;
  const hasEmail    = !!subscribe?.email;
  const hasTelegram = !!subscribe?.telegram;
  const hasWechat   = !!subscribe?.wechat?.qrCode;
  const hasNewsletter = hasSubstack || hasEmail;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text — clipboard API may not be available in all contexts
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Page header */}
      <header className="page-header">
        <h1 className="page-title">{t('subscribe')}</h1>
        <p className="page-subtitle">{t('subscribe_subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── RSS Feed ── always visible */}
        <SubscribeCard
          wide
          icon={<RssIcon />}
          title={t('rss_readers')}
          description={t('rss_description')}
        >
          {/* Reader quick-subscribe links */}
          <div className="flex flex-wrap gap-2">
            {rssReaders.map(({ name, url }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-muted/20 bg-background hover:border-accent hover:text-accent transition-colors no-underline"
              >
                {name}
                <LuExternalLink className="w-3 h-3 opacity-50" />
              </a>
            ))}
          </div>

          {/* Feed URL with copy button */}
          <div className="flex items-center gap-2 mt-1 px-3 py-2.5 rounded-lg bg-muted/5 border border-muted/15">
            <code className="text-xs font-mono text-muted/60 flex-1 truncate">{feedUrl}</code>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-muted/60 hover:text-accent transition-colors"
              aria-label={t('copy_feed_url')}
            >
              {copied
                ? <><LuCheck className="w-3.5 h-3.5 text-accent" /><span className="text-accent">{t('feed_url_copied')}</span></>
                : <><LuCopy className="w-3.5 h-3.5" /><span>{t('copy_feed_url')}</span></>
              }
            </button>
          </div>
        </SubscribeCard>

        {/* ── Email / Substack ── conditional */}
        {hasNewsletter && (
          <SubscribeCard
            icon={hasSubstack ? <SubstackIcon /> : <LuMail className="w-5 h-5" />}
            title={t('email_newsletter')}
            description={t('email_newsletter_description')}
          >
            {hasSubstack && (
              <a
                href={subscribe!.substack}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors no-underline"
              >
                <SubstackIcon />
                {t('subscribe_on_substack')}
                <LuExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}
            {!hasSubstack && hasEmail && (
              <a
                href={subscribe!.email}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors no-underline"
              >
                <LuMail className="w-4 h-4" />
                {t('subscribe_via_email')}
                <LuExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}
          </SubscribeCard>
        )}

        {/* ── Telegram ── conditional */}
        {hasTelegram && (
          <SubscribeCard
            icon={<TelegramIcon />}
            title={t('telegram_channel')}
            description={t('telegram_channel_description')}
          >
            <a
              href={subscribe!.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors no-underline"
            >
              <TelegramIcon />
              {t('join_channel')}
              <LuExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </SubscribeCard>
        )}

        {/* ── WeChat Official Account ── conditional */}
        {hasWechat && (
          <SubscribeCard
            icon={<WechatIcon />}
            title={t('wechat_official')}
            description={t('wechat_description')}
          >
            <div className="flex flex-col items-start gap-3">
              <div className="w-36 h-36 rounded-xl border border-muted/20 overflow-hidden bg-white flex items-center justify-center">
                <Image
                  src={subscribe!.wechat!.qrCode}
                  alt={subscribe?.wechat?.account || 'WeChat QR Code'}
                  width={144}
                  height={144}
                  className="object-contain"
                />
              </div>
              {subscribe?.wechat?.account && (
                <p className="text-sm font-mono text-muted/60">{subscribe.wechat.account}</p>
              )}
              <p className="text-xs text-muted/50 italic">{t('scan_qr_code')}</p>
            </div>
          </SubscribeCard>
        )}

        {/* ── Social connections ── always visible if social links exist */}
        {(social?.twitter || social?.github || social?.email) && (
          <SubscribeCard
            wide={!hasNewsletter && !hasTelegram && !hasWechat}
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            }
            title={t('social_connections')}
            description="Follow along on social platforms for updates, discussions, and more."
          >
            <div className="flex flex-wrap gap-2">
              {social?.twitter && (
                <a
                  href={social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-muted/20 bg-background hover:border-accent hover:text-accent transition-colors no-underline"
                >
                  <XIcon />
                  Twitter / X
                </a>
              )}
              {social?.github && (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-muted/20 bg-background hover:border-accent hover:text-accent transition-colors no-underline"
                >
                  <LuGithub className="w-4 h-4" />
                  GitHub
                </a>
              )}
              {social?.email && (
                <a
                  href={social.email}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-muted/20 bg-background hover:border-accent hover:text-accent transition-colors no-underline"
                >
                  <LuMail className="w-4 h-4" />
                  Email
                </a>
              )}
            </div>
          </SubscribeCard>
        )}

      </div>

      {/* Tip note about RSS */}
      <p className="mt-10 text-xs text-muted/50 text-center">
        RSS is an open standard — no account required. Copy the feed URL into any reader app.{' '}
        <Link href="/feed.xml" className="hover:text-accent transition-colors" target="_blank">
          View raw feed →
        </Link>
      </p>
    </div>
  );
}
