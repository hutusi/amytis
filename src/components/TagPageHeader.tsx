'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

interface TagPageHeaderProps {
  tag: string;
}

export default function TagPageHeader({ tag }: TagPageHeaderProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Back link: visible only on mobile (desktop has sidebar) */}
      <nav className="mb-8 flex lg:hidden">
        <Link
          href="/tags"
          className="text-xs font-bold uppercase tracking-widest text-muted hover:text-accent transition-colors no-underline"
        >
          &larr; {t('tags')}
        </Link>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-heading">
          <span className="text-accent/50 mr-1">#</span>{tag}
        </h1>
      </header>
    </>
  );
}
