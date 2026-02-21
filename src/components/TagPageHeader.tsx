'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

interface TagPageHeaderProps {
  tag: string;
  postCount: number;
}

export default function TagPageHeader({ tag, postCount }: TagPageHeaderProps) {
  const { t, tWith } = useLanguage();

  const subtitleKey = postCount === 1 ? 'tag_posts_found_one' : 'tag_posts_found';
  const subtitle = tWith(subtitleKey, { count: postCount });

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
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-heading mb-2">
          <span className="text-accent/50 mr-1">#</span>{tag}
        </h1>
        <p className="text-sm text-muted font-serif italic">
          {subtitle}
        </p>
      </header>
    </>
  );
}
