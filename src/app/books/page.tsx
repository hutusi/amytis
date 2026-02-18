import { getAllBooks } from '@/lib/markdown';
import Link from 'next/link';
import { siteConfig } from '../../../site.config';
import { Metadata } from 'next';
import CoverImage from '@/components/CoverImage';
import { t, resolveLocale } from '@/lib/i18n';
import PageHeader from '@/components/PageHeader';

export const metadata: Metadata = {
  title: `${t('books')} | ${resolveLocale(siteConfig.title)}`,
  description: 'Structured long-form books and guides.',
};

export default function BooksPage() {
  const books = getAllBooks();

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="books"
        subtitleKey="series_subtitle"
        subtitleOneKey="series_subtitle_one"
        count={books.length}
        subtitleParams={{ count: books.length }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {books.map(book => (
          <Link key={book.slug} href={`/books/${book.slug}`} className="group block no-underline">
            <div className="card-base h-full group flex flex-col p-0 overflow-hidden">
              <div className="relative h-48 w-full overflow-hidden bg-muted/10">
                <CoverImage
                  src={book.coverImage}
                  title={book.title}
                  slug={book.slug}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-8">
                <span className="badge-accent mb-4 inline-block">
                  {book.chapters.length} {t('chapters_count')}
                </span>
                <h2 className="mb-3 font-serif text-2xl font-bold text-heading group-hover:text-accent transition-colors">
                  {book.title}
                </h2>
                {book.authors.length > 0 && (
                  <p className="text-xs text-muted mb-3">
                    {t('written_by')} {book.authors.slice(0, 3).join(', ')}
                  </p>
                )}
                {book.excerpt && (
                  <p className="text-muted font-serif italic leading-relaxed line-clamp-3">
                    {book.excerpt}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
