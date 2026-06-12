import { getAuthorSlug } from '@/lib/content/authors';
import { getBookData, getAllBooks, type BookTocSection, type BookChapterRef } from '@/lib/content/books';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { siteConfig } from '../../../../site.config';
import CoverImage from '@/components/CoverImage';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Link from 'next/link';
import { t, resolveLocale } from '@/lib/i18n';
import { buildBookJsonLd, serializeJsonLd } from '@/lib/json-ld';
import { getBookUrl, getBookChapterUrl } from '@/lib/urls';
import { safeDecodeParam } from '@/lib/route-params';

// Visual depth limit for nested-section headings. After the first two levels
// we keep nesting structurally but stop bumping the heading style so deeply
// nested books don't degrade into tiny text.
const MAX_HEADING_DEPTH = 2;

function chapterRow(ref: BookChapterRef, slug: string, key: string) {
  return (
    <li key={key}>
      <Link
        href={getBookChapterUrl(slug, ref.id)}
        className="group flex items-center gap-3 py-2 text-foreground/80 hover:text-accent no-underline transition-colors"
      >
        <svg className="w-4 h-4 text-muted group-hover:text-accent flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-base">{ref.title}</span>
      </Link>
    </li>
  );
}

function renderTocSection(section: BookTocSection, slug: string, keyPrefix: string, depth: number): React.ReactNode {
  const headingDepth = Math.min(depth, MAX_HEADING_DEPTH);
  const headingClass =
    headingDepth === 0
      ? 'text-lg font-serif font-bold text-heading mb-3'
      : headingDepth === 1
      ? 'text-sm font-sans font-bold uppercase tracking-wider text-muted mb-3'
      : 'text-xs font-sans font-semibold uppercase tracking-wider text-muted/80 mb-2';

  return (
    <div key={keyPrefix} className={depth === 0 ? '' : 'mt-3'}>
      <h3 className={headingClass}>{section.section}</h3>
      <ol className="space-y-2 pl-4 border-l-2 border-ink/[0.05]">
        {section.items.map((child, idx) =>
          'section' in child
            ? <li key={`${keyPrefix}-${idx}`}>{renderTocSection(child, slug, `${keyPrefix}-${idx}`, depth + 1)}</li>
            : chapterRow(child, slug, `${keyPrefix}-${child.id}`)
        )}
      </ol>
    </div>
  );
}

export async function generateStaticParams() {
  const books = getAllBooks();
  if (books.length === 0) return [{ slug: '_' }];
  return books.map(book => ({ slug: book.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = getBookData(safeDecodeParam(slug));

  if (!book) {
    return { title: 'Book Not Found' };
  }

  const ogImage = book.coverImage && !book.coverImage.startsWith('text:') && !book.coverImage.startsWith('./')
    ? book.coverImage
    : siteConfig.ogImage;

  return {
    title: `${book.title} | ${resolveLocale(siteConfig.title)}`,
    description: book.excerpt,
    openGraph: {
      title: book.title,
      description: book.excerpt,
      type: 'website',
      url: `${siteConfig.baseUrl}${getBookUrl(book.slug)}`,
      siteName: resolveLocale(siteConfig.title),
      images: [{ url: ogImage, width: 1200, height: 630, alt: book.title }],
    },
    twitter: {
      card: ogImage !== siteConfig.ogImage ? 'summary_large_image' : 'summary',
      title: book.title,
      description: book.excerpt,
      images: [ogImage],
    },
  };
}

export default async function BookLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = safeDecodeParam(rawSlug);
  const book = getBookData(slug);

  if (!book || (process.env.NODE_ENV === 'production' && book.draft)) {
    notFound();
  }

  const firstChapter = book.chapters.length > 0 ? book.chapters[0] : null;

  const siteUrl = siteConfig.baseUrl.replace(/\/+$/, '');
  const jsonLd = buildBookJsonLd({
    book,
    bookUrl: `${siteUrl}${getBookUrl(slug)}`,
    siteTitle: resolveLocale(siteConfig.title),
    siteUrl,
    defaultOgImage: siteConfig.ogImage,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
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

          {/* Start Reading CTAs */}
          {firstChapter && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={getBookChapterUrl(book.slug, firstChapter.id)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-sans font-medium text-sm hover:bg-accent/90 no-underline transition-colors shadow-lg shadow-accent/20"
              >
                {t('start_reading')}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              {/* Secondary CTA — opens the first chapter in immersive mode.
                  The `?immersive=1` query param is read by ImmersiveReadingProvider
                  on mount, which calls enter() then strips the flag from the URL
                  so back-navigation doesn't re-trigger it. */}
              <Link
                href={`${getBookChapterUrl(book.slug, firstChapter.id)}?immersive=1`}
                className="inline-flex items-center gap-2 px-5 py-3 border border-ink/[0.10] text-foreground/80 hover:text-accent hover:border-accent/50 rounded-xl font-sans font-medium text-sm no-underline transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                </svg>
                {t('immersive_reading')}
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
                  <ol className="space-y-2 pl-4 border-l-2 border-ink/[0.05]">
                    {item.chapters.map(ch => chapterRow(ch, book.slug, ch.id))}
                  </ol>
                </div>
              );
            }
            if ('section' in item) {
              return renderTocSection(item, book.slug, `section-${idx}`, 0);
            }
            return (
              <Link
                key={item.id}
                href={getBookChapterUrl(book.slug, item.id)}
                className="group flex items-center gap-3 py-2 text-foreground/80 hover:text-accent no-underline transition-colors"
              >
                <svg className="w-4 h-4 text-muted group-hover:text-accent flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-base">{item.title}</span>
              </Link>
            );
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
    </>
  );
}
