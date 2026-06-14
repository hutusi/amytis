import { getAllBooks } from '@/lib/content/books';
import { getBookUrl } from '@/lib/urls';
import { Metadata } from 'next';
import ContentCard from '@/components/ContentCard';
import { t } from '@/lib/i18n';
import { createListingMetadata } from '@/lib/metadata';
import PageHeader from '@/components/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  const books = getAllBooks();
  return createListingMetadata({
    titleKey: 'books',
    descriptionKey: 'books_subtitle',
    descriptionOneKey: 'books_subtitle_one',
    count: books.length,
  });
}

export default function BooksPage() {
  const books = getAllBooks();

  return (
    <div className="layout-main">
      <PageHeader
        titleKey="books"
        subtitleKey="books_subtitle"
        subtitleOneKey="books_subtitle_one"
        count={books.length}
        subtitleParams={{ count: books.length }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {books.map(book => (
          <ContentCard
            key={book.slug}
            href={getBookUrl(book.slug)}
            title={book.title}
            slug={book.slug}
            coverImage={book.coverImage}
            badge={`${book.chapters.length} ${t('chapters_count')}`}
            authors={book.authors}
            excerpt={book.excerpt}
          />
        ))}
      </div>
    </div>
  );
}
