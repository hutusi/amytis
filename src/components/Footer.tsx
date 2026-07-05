import Link from 'next/link';
import { siteConfig } from '../../site.config';
import { T, TLabel, TLocale } from '@/components/T';
import LanguageSwitch from './LanguageSwitch';

// Server component: all language-reactive strings render via the T/TLabel/
// TLocale client leaves; LanguageSwitch is its own client island.
export default function Footer() {
  return (
    <footer data-site-footer className="bg-surface-faint border-t border-line mt-auto select-none">
      <div className="max-w-6xl mx-auto px-6 py-10 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-10 lg:mb-12">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center justify-center lg:justify-start gap-2 mb-4 group no-underline">
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
              <span className="font-serif font-bold text-lg text-heading"><TLocale value={siteConfig.title} /></span>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-sm mx-auto text-center lg:mx-0 lg:text-left">
              <TLocale value={siteConfig.description} />
            </p>
          </div>

          {/* Navigation */}
          <div className="text-center lg:text-left">
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-muted/80 mb-6"><T k="explore" /></h4>
            <ul className="space-y-3 text-sm">
              {[...(siteConfig.footer?.explore ?? [])].sort((a, b) => a.weight - b.weight).map((item) => (
                <li key={item.url}>
                  <Link href={item.url} className="text-foreground/80 hover:text-accent transition-colors no-underline">
                    <TLabel name={item.name} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="text-center lg:text-left">
            <h4 className="font-sans font-bold text-xs uppercase tracking-widest text-muted/80 mb-6"><T k="connect" /></h4>
            <ul className="space-y-3 text-sm">
              {[...(siteConfig.footer?.connect ?? [])].sort((a, b) => a.weight - b.weight).map((item) => {
                const isExternal = item.external || item.url.startsWith('http');
                const className = "text-foreground/80 hover:text-accent transition-colors no-underline flex items-center justify-center lg:justify-start gap-2";
                return (
                  <li key={item.url}>
                    {isExternal ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}>
                        <TLabel name={item.name} />
                      </a>
                    ) : (
                      <Link href={item.url} className={className}>
                        <TLabel name={item.name} />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-line flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted">
          <span><TLocale value={siteConfig.footerText} /></span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
             {siteConfig.i18n.enabled !== false && siteConfig.i18n.locales.length >= 2 && (
               <>
                 <LanguageSwitch variant="text" />
                 <span className="opacity-20">|</span>
               </>
             )}
             <Link href="/privacy" className="hover:text-foreground transition-colors no-underline"><T k="privacy" /></Link>
             {siteConfig.footer?.bottomLinks?.map((item, index) => {
               const label = <TLocale value={item.text} />;
               const isInternal = item.url?.startsWith('/');
               return (
                 <span key={`${index}:${item.url ?? 'text'}`} className="flex items-center gap-x-6">
                   <span className="opacity-20">|</span>
                   {item.url ? (
                     isInternal ? (
                       <Link href={item.url} className="hover:text-foreground transition-colors no-underline">{label}</Link>
                     ) : (
                       <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors no-underline">{label}</a>
                     )
                   ) : (
                     <span>{label}</span>
                   )}
                 </span>
               );
             })}
             {siteConfig.footer?.builtWith?.show && (() => {
               const cfg = siteConfig.footer.builtWith;
               return (
                 <>
                   <span className="opacity-20">|</span>
                   <a href={cfg.url ?? 'https://github.com/hutusi/amytis'} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors no-underline">
                     {cfg.text ? <TLocale value={cfg.text} /> : <T k="built_with" />}
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
