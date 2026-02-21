'use client';

import Link from 'next/link';
import { siteConfig } from '../../site.config';
import { useLanguage } from '@/components/LanguageProvider';
import { resolveLocaleValue } from '@/lib/i18n';
import { TranslationKey } from '@/i18n/translations';
import LanguageSwitch from './LanguageSwitch';

export default function Footer() {
  const { t, language } = useLanguage();
  
  return (
    <footer className="bg-muted/5 border-t border-muted/10 mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group no-underline">
              <svg
                viewBox="0 0 32 32"
                className="w-6 h-6 text-accent group-hover:rotate-12 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 4 L7 28" />
                <path d="M16 4 L25 28" />
                <path d="M11.5 18 H 20.5" />
                <path d="M20.5 18 Q 26 14 26 8 Q 23 12 20.5 18" fill="currentColor" stroke="none" />
              </svg>
              <span className="font-serif font-bold text-lg text-heading">{resolveLocaleValue(siteConfig.title, language)}</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-sm">
              {resolveLocaleValue(siteConfig.description, language)}
            </p>
          </div>
          
          {/* Navigation */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-muted/80 mb-6">{t('explore')}</h4>
            <ul className="space-y-3 text-sm">
              {[...(siteConfig.footer?.explore ?? [])].sort((a, b) => a.weight - b.weight).map((item) => {
                const key = item.name.toLowerCase() as TranslationKey;
                const translated = t(key);
                const label = translated !== key ? translated : item.name;
                return (
                  <li key={item.url}>
                    <Link href={item.url} className="text-foreground/80 hover:text-accent transition-colors no-underline">
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-muted/80 mb-6">{t('connect')}</h4>
            <ul className="space-y-3 text-sm">
              {siteConfig.social.github && (
                <li>
                  <a href={siteConfig.social.github} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-accent transition-colors no-underline flex items-center gap-2">
                    GitHub
                  </a>
                </li>
              )}
              {siteConfig.social.twitter && (
                <li>
                  <a href={siteConfig.social.twitter} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-accent transition-colors no-underline flex items-center gap-2">
                    Twitter
                  </a>
                </li>
              )}
              <li>
                <a href="/feed.xml" className="text-foreground/80 hover:text-accent transition-colors no-underline flex items-center gap-2">
                  {t('rss_feed')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-muted/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted">
          <span>{resolveLocaleValue(siteConfig.footerText, language)}</span>
          <div className="flex items-center gap-6">
             <LanguageSwitch variant="text" />
             <span className="opacity-20">|</span>
             <Link href="/privacy" className="hover:text-foreground transition-colors no-underline">{t('privacy')}</Link>
             {siteConfig.footer?.builtWith?.show && (() => {
               const cfg = siteConfig.footer.builtWith;
               const label = cfg.text ? resolveLocaleValue(cfg.text, language) : t('built_with');
               return (
                 <>
                   <span className="opacity-20">|</span>
                   <a href={cfg.url ?? 'https://github.com/hutusi/amytis'} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors no-underline">
                     {label}
                   </a>
                 </>
               );
             })()}
          </div>
        </div>
      </div>
    </footer>
  );
}