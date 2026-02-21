import { getBookData, getAllBooks, getAuthorSlug } from '@/lib/markdown';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import CoverImage from '@/components/CoverImage';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';
import { t, resolveLocale } from '@/lib/i18n';

export async function generateStaticParams() {
  const books = getAllBooks();
  return books.map(book => ({ slug: book.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = getBookData(decodeURIComponent(slug));

  if (!book) {
    return { title: 'Book Not Found' };
  }

  const ogImage = book.coverImage && !book.coverImage.startsWith('text:') && !book.coverImage.startsWith('./')
    ? book.coverImage
    : '/icon.svg';

  return {
    title: `${book.title} | ${resolveLocale(siteConfig.title)}`,
    description: book.excerpt,
    openGraph: {
      title: book.title,
      description: book.excerpt,
      type: 'website',
      url: `${siteConfig.baseUrl}/books/${slug}`,
      siteName: resolveLocale(siteConfig.title),
      images: [{ url: ogImage, width: 1200, height: 630, alt: book.title }],
    },
    twitter: {
      card: ogImage !== '/icon.svg' ? 'summary_large_image' : 'summary',
      title: book.title,
      description: book.excerpt,
      images: [ogImage],
    },
  };
}

export default async function BookLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const book = getBookData(slug);

  if (!book || (process.env.NODE_ENV === 'production' && book.draft)) {
    notFound();
  }

  const firstChapter = book.chapters.length > 0 ? book.chapters[0] : null;

  return (
    <div className="layout-main">
      <header className="mb-16">
        {/* Cover image */}
        {book.coverImage && (
          <div className="relative w-full h-56 md:h-72 mb-10 rounded-2xl overflow-hidden shadow-xl shadow-accent/5">
            <CoverImage
              src={book.coverImage}
              title={book.title}
              slug={book.slug}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
        )}

        <div className="text-center max-w-2xl mx-auto">
          <span className="badge-accent mb-4">
            {t('book')} &bull; {book.chapters.length} {t('chapters_count')}
          </span>
          <h1 className="page-title mb-4">{book.title}</h1>
          {book.excerpt && (
            <p className="text-lg text-muted font-serif italic leading-relaxed">
              {book.excerpt}
            </p>
          )}
          {book.authors.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              <span className="mr-1">{t('written_by')}</span>
              {book.authors.map((author, index) => (
                <span key={author}>
                  <Link
                    href={`/authors/${getAuthorSlug(author)}`}
                    className="text-foreground hover:text-accent no-underline transition-colors duration-200"
                  >
                    {author}
                  </Link>
                  {index < book.authors.length - 1 && <span className="mr-1">,</span>}
                </span>
              ))}
            </p>
          )}

          {/* Start Reading CTA */}
          {firstChapter && (
            <div className="mt-8">
              <Link
                href={`/books/${book.slug}/${firstChapter.file}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-sans font-medium text-sm hover:bg-accent/90 no-underline transition-colors shadow-lg shadow-accent/20"
              >
                {t('start_reading')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Table of Contents */}
      <section className="max-w-2xl mx-auto mb-16">
        <h2 className="text-xl font-serif font-bold text-heading mb-8">{t('chapters_count')}</h2>
        <div className="space-y-6">
          {book.toc.map((item, idx) => {
            if ('part' in item) {
              return (
                <div key={`part-${idx}`}>
                  <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-muted mb-3">
                    {item.part}
                  </h3>
                  <ol className="space-y-2 pl-4 border-l-2 border-muted/10">
                    {item.chapters.map(ch => (
                      <li key={ch.file}>
                        <Link
                          href={`/books/${book.slug}/${ch.file}`}
                          className="group flex items-center gap-3 py-2 text-foreground/80 hover:text-accent no-underline transition-colors"
                        >
                          <svg className="w-4 h-4 text-muted group-hover:text-accent flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-base">{ch.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            } else {
              return (
                <Link
                  key={item.file}
                  href={`/books/${book.slug}/${item.file}`}
                  className="group flex items-center gap-3 py-2 text-foreground/80 hover:text-accent no-underline transition-colors"
                >
                  <svg className="w-4 h-4 text-muted group-hover:text-accent flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-base">{item.title}</span>
                </Link>
              );
            }
          })}
        </div>
      </section>

      {/* Book body content */}
      {book.content && (
        <section className="max-w-2xl mx-auto">
          <MarkdownRenderer content={book.content} slug={`books/${book.slug}`} />
        </section>
      )}
    </div>
  );
}
