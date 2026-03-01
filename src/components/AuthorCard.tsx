import Link from 'next/link';
import { getAuthorSlug } from '@/lib/markdown';
import { siteConfig } from '../../site.config';
import { t } from '@/lib/i18n';

export default function AuthorCard({ authors }: { authors: string[] }) {
  if (!authors || authors.length === 0) return null;

  return (
    <div className="mt-12 pt-12 border-t border-muted/20 flex flex-col gap-4">
      {authors.map((author) => {
        const slug = getAuthorSlug(author);
        const profile = siteConfig.authors?.[author];
        const hasSocial = profile?.social && profile.social.length > 0;

        return (
          <div
            key={author}
            className="flex flex-col sm:flex-row sm:items-center gap-5 rounded-2xl border border-muted/15 bg-muted/[0.04] px-6 py-5 transition-colors hover:bg-muted/[0.08]"
          >
            {/* Left — avatar + author info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={author}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-muted/20"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent font-serif font-bold text-2xl select-none">
                  {author.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted mb-1">
                  {t('written_by')}
                </p>
                <Link
                  href={`/authors/${slug}`}
                  className="font-serif font-semibold text-lg text-heading hover:text-accent transition-colors no-underline"
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

            {/* Right — social images (e.g. QR codes) */}
            {hasSocial && (
              <div className="flex gap-5 sm:pl-6 sm:border-l sm:border-muted/15 flex-shrink-0">
                {profile.social!.map((item, index) => (
                  <figure key={index} className="flex flex-col items-center gap-1.5">
                    <img
                      src={item.image}
                      alt={item.description}
                      className="w-[72px] h-[72px] object-contain rounded-lg bg-white p-0.5"
                    />
                    <figcaption className="text-[10px] font-sans text-muted text-center leading-tight max-w-[72px]">
                      {item.description}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
