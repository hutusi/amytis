import Link from 'next/link';
import { siteConfig } from '../../site.config';

export default function Footer() {
  return (
    <footer className="border-t border-muted/10 mt-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <svg 
              viewBox="0 0 32 32" 
              className="w-6 h-6 text-accent opacity-80"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M16 4 L7 28" />
              <path d="M16 4 L25 28" />
              <path d="M11.5 18 H 20.5" />
              <path d="M20.5 18 Q 26 14 26 8 Q 23 12 20.5 18" fill="currentColor" stroke="none" />
            </svg>
            <span className="font-serif font-bold text-heading">
              {siteConfig.title}
            </span>
          </div>
          
          <div className="text-sm text-muted/80 font-sans text-center md:text-right">
            <p>{siteConfig.footerText}</p>
            <p className="mt-1 opacity-60 italic">
              Cultivated in the digital garden.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
