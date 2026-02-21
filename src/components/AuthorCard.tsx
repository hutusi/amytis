import Link from 'next/link';
import { getAuthorSlug } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import { t } from '@/lib/i18n';

export default function AuthorCard({ authors }: { authors: string[] }) {
  if (!authors || authors.length === 0) return null;

  return (
    <div className="mt-12 pt-12 border-t border-muted/20">
      <div className="flex flex-col gap-6">
        {authors.map((author) => {
          const slug = getAuthorSlug(author);
          const profile = siteConfig.authors?.[author];

          return (
            <div key={author} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent font-serif font-bold text-lg select-none">
                {author.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-1">
                  {t('written_by')}
                </p>
                <Link
                  href={`/authors/${slug}`}
                  className="font-serif font-semibold text-heading hover:text-accent transition-colors no-underline"
                >
                  {author}
                </Link>
                {profile?.bio && (
                  <p className="text-sm text-foreground/70 mt-1.5 leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
