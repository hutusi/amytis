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
  featureNames?: {
    flow?: LocaleValue;
    posts?: LocaleValue;
    series?: LocaleValue;
    books?: LocaleValue;
  };
}

interface StatItem {
  href: string;
  count: number;
  label: string;
}

export default function Hero({ tagline, title, subtitle, postCount, seriesCount, bookCount, flowCount, featureNames }: HeroProps) {
  const { language } = useLanguage();
  const resolvedTagline = resolveLocaleValue(tagline, language);
  const resolvedTitle = resolveLocaleValue(title, language);
  const resolvedSubtitle = resolveLocaleValue(subtitle, language);

  const label = (key: keyof NonNullable<typeof featureNames>, fallback: string) =>
    featureNames?.[key] ? resolveLocaleValue(featureNames[key]!, language) : fallback;

  const stats = [
    flowCount   != null ? { href: '#recent-flows',    count: flowCount,   label: label('flow',   'Flow')    } : null,
    postCount   != null ? { href: '#featured-posts',  count: postCount,   label: label('posts',  'Posts')   } : null,
    seriesCount != null ? { href: '#featured-series', count: seriesCount, label: label('series', 'Series')  } : null,
    bookCount   != null ? { href: '#featured-books',  count: bookCount,   label: label('books',  'Books')   } : null,
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
        <div className="mt-8 flex flex-wrap justify-center items-center gap-x-1 gap-y-2 text-xs sm:text-sm font-mono animate-slide-up animation-delay-200">
          {stats.map((stat, i) => (
            <span key={stat.href} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-muted/30 mx-1 sm:mx-2" aria-hidden>·</span>}
              <Link href={stat.href} className="group no-underline">
                <span className="font-semibold text-heading group-hover:text-accent transition-colors duration-200">{stat.count}</span>
                <span className="text-muted ml-1 group-hover:text-accent/70 transition-colors duration-200">{stat.label}</span>
              </Link>
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
