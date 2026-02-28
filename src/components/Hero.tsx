'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { resolveLocaleValue } from '@/lib/i18n';

type LocaleValue = string | Record<string, string>;

interface HeroProps {
  tagline: LocaleValue;
  title: LocaleValue;
  subtitle: LocaleValue;
  postCount?: number;
  seriesCount?: number;
  bookCount?: number;
  flowCount?: number;
}

interface StatItem {
  href: string;
  count: number;
  label: string;
}

function StatCard({ href, count, label }: StatItem) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 px-6 py-4 rounded-xl border border-muted/15 bg-muted/5 hover:border-accent/40 hover:bg-accent/5 transition-all duration-200 no-underline"
    >
      <span className="text-2xl font-serif font-bold text-heading group-hover:text-accent transition-colors duration-200">
        {count}
      </span>
      <span className="text-xs font-mono uppercase tracking-widest text-muted">
        {label}
      </span>
    </Link>
  );
}

export default function Hero({ tagline, title, subtitle, postCount, seriesCount, bookCount, flowCount }: HeroProps) {
  const { language } = useLanguage();
  const resolvedTagline = resolveLocaleValue(tagline, language);
  const resolvedTitle = resolveLocaleValue(title, language);
  const resolvedSubtitle = resolveLocaleValue(subtitle, language);

  const stats = [
    flowCount   ? { href: '#recent-flows',    count: flowCount,   label: 'flows'  } : null,
    postCount   ? { href: '#featured-posts',  count: postCount,   label: 'posts'  } : null,
    seriesCount ? { href: '#featured-series', count: seriesCount, label: 'series' } : null,
    bookCount   ? { href: '#featured-books',  count: bookCount,   label: 'books'  } : null,
  ].filter((s): s is StatItem => s !== null);

  return (
    <header className="relative py-12 md:py-20 flex flex-col items-center justify-center text-center max-w-6xl mx-auto min-h-[40vh] px-6">
      <div className="mb-8 flex items-center justify-center animate-fade-in">
        <span className="h-px w-12 bg-accent/30 mr-4"></span>
        <span className="text-xs font-sans font-bold uppercase tracking-[0.3em] text-accent/80">{resolvedTagline}</span>
        <span className="h-px w-12 bg-accent/30 ml-4"></span>
      </div>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-heading leading-[1.1] tracking-tight mb-6 text-balance animate-slide-up">
        {resolvedTitle}
      </h1>

      <p className="text-muted font-sans text-sm md:text-base max-w-xl mx-auto leading-relaxed opacity-80 animate-slide-up animation-delay-200">
        {resolvedSubtitle}
      </p>

      {stats.length > 0 && (
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg animate-slide-up animation-delay-200">
          {stats.map(stat => (
            <StatCard key={stat.href} {...stat} />
          ))}
        </div>
      )}
    </header>
  );
}
