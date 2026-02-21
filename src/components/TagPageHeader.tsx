'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

interface TagPageHeaderProps {
  tag: string;
  postCount: number;
  flowCount: number;
}

export default function TagPageHeader({ tag, postCount, flowCount }: TagPageHeaderProps) {
  const { t, tWith } = useLanguage();

  const parts: string[] = [];
  if (postCount > 0) {
    parts.push(tWith(postCount === 1 ? 'tag_post_count_one' : 'tag_post_count', { count: postCount }));
  }
  if (flowCount > 0) {
    parts.push(tWith(flowCount === 1 ? 'tag_flow_count_one' : 'tag_flow_count', { count: flowCount }));
  }
  const subtitle = parts.join(' · ');

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
